import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpense,
	createSubscription,
	getCurrencyRatesByOrganization,
	getExpenseAccountById,
	getExpenseCategoryById,
} from "@repo/database";
import {
	addDays,
	addMonths,
	addYears,
	isPast,
	isToday,
	startOfDay,
} from "date-fns";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";
import { fetchFavicon } from "../../lib/fetch-favicon";

export const createStandaloneSubscriptionProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/subscriptions/standalone",
		tags: ["Expenses"],
		summary: "Create a standalone subscription",
		description:
			"Create a subscription. If startDate is past or today, automatically creates an expense.",
	})
	.input(
		z.object({
			expenseAccountId: z.string(),
			categoryId: z.string(), // Expense category for auto-created expenses
			title: z.string().min(1),
			description: z.string().optional(),
			websiteUrl: z.string().url().optional().or(z.literal("")),
			amount: z.number().positive(), // Renamed from currentAmount
			currency: z.string().default("USD"),
			rateType: z
				.enum(["default", "custom"])
				.default("default")
				.optional(),
			customRate: z.number().positive().optional(),
			startDate: z.coerce.date(),
			renewalDate: z.coerce.date().optional(), // Optional - will be auto-calculated if start date is in past
			renewalFrequency: z
				.enum(["monthly", "yearly", "weekly"])
				.default("monthly"),
			reminderDays: z.number().int().min(1).max(30).default(7),
			paymentMethodId: z.string().optional(),
			status: z.enum(["active", "inactive"]).default("active"),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const expenseAccount = await getExpenseAccountById(
			input.expenseAccountId,
		);

		if (!expenseAccount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Expense account not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Verify category exists
		const category = await getExpenseCategoryById(input.categoryId);
		if (!category) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Category not found",
			});
		}

		// Fetch favicon if website URL is provided
		let websiteIcon: string | null = null;
		if (input.websiteUrl) {
			websiteIcon = await fetchFavicon(input.websiteUrl);
		}

		// Handle currency conversion
		const baseCurrency = config.expenses.defaultBaseCurrency;
		const expenseCurrency =
			input.currency || expenseAccount.currency || baseCurrency;
		let conversionRate: number | null = null;
		let baseCurrencyAmount: number | null = null;
		const rateType: string = input.rateType || "default";

		if (expenseCurrency !== baseCurrency) {
			if (rateType === "custom" && input.customRate) {
				conversionRate = input.customRate;
			} else {
				const currencyRates = await getCurrencyRatesByOrganization(
					expenseAccount.organizationId,
				);
				const rate = currencyRates.find(
					(r) => r.toCurrency === expenseCurrency,
				);

				if (!rate) {
					throw new ORPCError("BAD_REQUEST", {
						message: `Conversion rate not found for ${expenseCurrency}. Please set up the currency rate in workspace settings or use a custom rate.`,
					});
				}

				conversionRate = Number(rate.rate);
			}

			// Calculate base currency amount
			baseCurrencyAmount = input.amount / conversionRate;
		} else {
			baseCurrencyAmount = input.amount;
		}

		const startDateStartOfDay = startOfDay(input.startDate);

		// Auto-calculate renewal date if start date is in the past
		// If user paid 2 days ago, renewal should be next month same day
		let finalRenewalDate: Date;

		if (input.renewalDate) {
			// User provided renewal date - validate it's not in the past
			const renewalDateStartOfDay = startOfDay(input.renewalDate);
			if (
				isPast(renewalDateStartOfDay) &&
				!isToday(renewalDateStartOfDay)
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Renewal date cannot be in the past. Please select today or a future date.",
				});
			}
			finalRenewalDate = input.renewalDate;
		} else {
			// Auto-calculate renewal date
			if (isPast(startDateStartOfDay) && !isToday(startDateStartOfDay)) {
				// Start date is in the past - calculate next period from start date
				if (input.renewalFrequency === "monthly") {
					finalRenewalDate = addMonths(input.startDate, 1);
				} else if (input.renewalFrequency === "yearly") {
					finalRenewalDate = addYears(input.startDate, 1);
				} else if (input.renewalFrequency === "weekly") {
					finalRenewalDate = addDays(input.startDate, 7);
				} else {
					finalRenewalDate = addMonths(input.startDate, 1); // Default to monthly
				}

				// Ensure renewal date is not in the past (shouldn't happen, but safety check)
				if (
					isPast(startOfDay(finalRenewalDate)) &&
					!isToday(startOfDay(finalRenewalDate))
				) {
					// If calculated date is still in past, add another period
					if (input.renewalFrequency === "monthly") {
						finalRenewalDate = addMonths(finalRenewalDate, 1);
					} else if (input.renewalFrequency === "yearly") {
						finalRenewalDate = addYears(finalRenewalDate, 1);
					} else if (input.renewalFrequency === "weekly") {
						finalRenewalDate = addDays(finalRenewalDate, 7);
					}
				}
			} else {
				// Start date is today or future - calculate renewal date from start date
				if (input.renewalFrequency === "monthly") {
					finalRenewalDate = addMonths(input.startDate, 1);
				} else if (input.renewalFrequency === "yearly") {
					finalRenewalDate = addYears(input.startDate, 1);
				} else if (input.renewalFrequency === "weekly") {
					finalRenewalDate = addDays(input.startDate, 7);
				} else {
					finalRenewalDate = addMonths(input.startDate, 1); // Default to monthly
				}
			}
		}

		// Calculate next reminder date
		const nextReminderDate = addDays(finalRenewalDate, -input.reminderDays);

		// Create subscription
		const subscription = await createSubscription({
			expenseAccountId: input.expenseAccountId,
			title: input.title,
			description: input.description,
			websiteUrl: input.websiteUrl || undefined,
			websiteIcon: websiteIcon || undefined,
			amount: input.amount,
			currency: expenseCurrency,
			conversionRate: conversionRate ?? undefined,
			rateType,
			baseCurrencyAmount,
			startDate: input.startDate,
			renewalDate: finalRenewalDate,
			renewalFrequency: input.renewalFrequency,
			reminderDays: input.reminderDays,
			nextReminderDate,
			paymentMethodId: input.paymentMethodId,
			status: input.status,
		});

		// Only auto-create expense if start date is today or past AND renewal date is today or past
		// If renewal date is in future, user needs to create expense manually
		const renewalDateStartOfDayFinal = startOfDay(finalRenewalDate);
		const shouldCreateExpense =
			(isPast(startDateStartOfDay) || isToday(startDateStartOfDay)) &&
			(isPast(renewalDateStartOfDayFinal) ||
				isToday(renewalDateStartOfDayFinal));

		if (shouldCreateExpense) {
			await createExpense({
				businessId: input.expenseAccountId,
				categoryId: input.categoryId,
				title: input.title,
				description: input.description,
				amount: input.amount,
				currency: expenseCurrency,
				conversionRate: conversionRate ?? undefined,
				rateType,
				baseCurrencyAmount,
				date: input.startDate,
				paymentMethodId: input.paymentMethodId,
				status: "active",
				createdBy: user.id,
				subscriptionId: subscription.id,
				isAutoGenerated: true,
				expenseType: "subscription",
			});
		}

		// Fetch subscription with expenses
		const { getSubscriptionById } = await import("@repo/database");
		const fullSubscription = await getSubscriptionById(subscription.id);

		return fullSubscription;
	});

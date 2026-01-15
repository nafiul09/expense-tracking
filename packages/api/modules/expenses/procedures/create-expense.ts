import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpense,
	db,
	getCurrencyRatesByOrganization,
	getExpenseAccountById,
	getExpenseCategoryById,
	getTeamMemberById,
} from "@repo/database";
import { addDays, addMonths, addYears } from "date-fns";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const createExpenseProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses",
		tags: ["Expenses"],
		summary: "Create a new expense",
		description:
			"Create a new expense entry with conditional fields based on category type",
	})
	.input(
		z
			.object({
				businessId: z.string(),
				categoryId: z.string(),
				title: z.string().min(1).max(255).optional(),
				description: z.string().optional(),
				amount: z.number().positive(),
				currency: z.string().default("USD"),
				rateType: z
					.enum(["default", "custom"])
					.default("default")
					.optional(),
				customRate: z.number().positive().optional(),
				date: z.coerce.date(),
				paymentMethodId: z.string().optional(),
				receiptUrl: z.string().url().optional(),
				status: z.string().default("active"),
				metadata: z.record(z.string(), z.any()).optional(),
				// Subscription linking
				subscriptionId: z.string().optional(), // Link expense to existing subscription
				// Conditional: Subscription fields (for backward compatibility, but prefer subscriptionId)
				renewalFrequency: z.enum(["monthly", "yearly"]).optional(),
				renewalDate: z.coerce.date().optional(),
				provider: z.string().optional(),
				updateSubscriptionAmount: z.boolean().optional(), // If true, update subscription's currentAmount
				updateSubscriptionRenewalDate: z.coerce.date().optional(), // Update next renewal date
				// Conditional: Team Salary fields
				teamMemberId: z.string().optional(),
				salaryType: z.enum(["default", "custom"]).optional(),
				salaryMonth: z
					.string()
					.regex(/^\d{4}-\d{2}$/)
					.optional(), // Format: YYYY-MM
			})
			.superRefine((_data, _ctx) => {
				// Validation will happen in handler after fetching category
			}),
	)
	.handler(async ({ context: { user }, input }) => {
		const expenseAccount = await getExpenseAccountById(input.businessId);

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

		const category = await getExpenseCategoryById(input.categoryId);

		if (!category) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Category not found",
			});
		}

		if (category.organizationId !== expenseAccount.organizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Category does not belong to this workspace",
			});
		}

		// Validate conditional fields based on category type
		const categoryName = category.name.toLowerCase();
		const isTeamSalary =
			categoryName.includes("team salary") ||
			categoryName.includes("salary") ||
			categoryName === "team salary";
		const isSubscription =
			categoryName.includes("subscription") ||
			categoryName === "subscription";

		// Subscription validation
		if (isSubscription) {
			if (!input.renewalFrequency || !input.renewalDate) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Renewal frequency and renewal date are required for subscription expenses",
				});
			}
			if (!input.title) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Title is required for subscription expenses",
				});
			}
			// Don't allow team member for subscriptions
			if (input.teamMemberId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Team member cannot be assigned to subscription expenses",
				});
			}
		}

		// Team Salary validation
		if (isTeamSalary) {
			if (!input.teamMemberId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Team member is required for team salary expenses",
				});
			}
			if (!input.salaryType) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Salary type (default or custom) is required",
				});
			}

			// Get team member to auto-fill salary if using default
			const teamMember = await getTeamMemberById(input.teamMemberId);
			if (!teamMember) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Team member not found",
				});
			}

			// Check if team member is associated with this expense account
			const isAssociated =
				teamMember.businessId === input.businessId ||
				teamMember.accounts?.some(
					(acc) => acc.accountId === input.businessId,
				);

			if (!isAssociated) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Team member is not associated with this expense account",
				});
			}

			// Validate salary month is provided
			if (!input.salaryMonth) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Salary month is required for team salary expenses",
				});
			}

			// Check for duplicate salary for same team member + expense account + month
			const { getExpensesByBusinessId } = await import("@repo/database");
			const existingExpenses = await getExpensesByBusinessId(
				input.businessId,
				{
					teamMemberId: input.teamMemberId,
				},
			);

			const duplicateSalary = existingExpenses.find(
				(exp) =>
					exp.teamMemberId === input.teamMemberId &&
					exp.salaryMonth === input.salaryMonth &&
					exp.categoryId === input.categoryId &&
					exp.status !== "cancelled",
			);

			if (duplicateSalary) {
				const monthName = new Date(
					input.salaryMonth + "-01",
				).toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});
				throw new ORPCError("BAD_REQUEST", {
					message: `Salary for ${teamMember.name} has already been recorded for ${monthName} in this expense account`,
				});
			}

			// Auto-fill amount if using default salary
			if (input.salaryType === "default") {
				// Get salary from account association or legacy field
				const accountSalary = teamMember.accounts?.find(
					(acc) => acc.accountId === input.businessId,
				)?.salary;

				const defaultSalary = accountSalary || teamMember.salary || 0;

				if (Number(defaultSalary) === 0) {
					throw new ORPCError("BAD_REQUEST", {
						message:
							"Team member does not have a salary configured. Please use custom salary type.",
					});
				}

				// Override amount with team member's salary
				input.amount = Number(defaultSalary);
			}
		}

		// One-Time expense validation
		if (
			categoryName.includes("one-time") ||
			categoryName.includes("one time") ||
			categoryName === "one-time"
		) {
			if (!input.title) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Title is required for one-time expenses",
				});
			}
			// Don't allow team member or subscription fields for one-time
			if (input.teamMemberId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Team member cannot be assigned to one-time expenses",
				});
			}
			if (input.renewalFrequency || input.renewalDate) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Renewal fields are not applicable for one-time expenses",
				});
			}
		}

		const baseCurrency = config.expenses.defaultBaseCurrency;
		const expenseCurrency =
			input.currency || expenseAccount.currency || baseCurrency;
		const rateType = input.rateType || "default";

		let conversionRate: number | undefined;
		let baseCurrencyAmount: number | undefined;

		// If expense currency is different from base currency, calculate conversion
		if (expenseCurrency !== baseCurrency) {
			if (rateType === "custom" && input.customRate) {
				// Use custom rate provided by user
				conversionRate = input.customRate;
			} else {
				// Use default rate from organization settings
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
			// Same currency, no conversion needed
			baseCurrencyAmount = input.amount;
		}

		// Prepare expense data
		const expenseData: any = {
			businessId: input.businessId,
			categoryId: input.categoryId,
			title: input.title || `${category.name} Expense`,
			description: input.description,
			amount: input.amount,
			currency: expenseCurrency,
			conversionRate,
			rateType,
			baseCurrencyAmount,
			date: input.date,
			receiptUrl: input.receiptUrl,
			status: input.status,
			metadata: input.metadata,
			createdBy: user.id,
		};

		// Add conditional fields
		if (isTeamSalary && input.teamMemberId && input.salaryType) {
			expenseData.teamMemberId = input.teamMemberId;
			expenseData.salaryMonth = input.salaryMonth;
			// For team salary, set date to first day of the selected month
			if (input.salaryMonth) {
				expenseData.date = new Date(input.salaryMonth + "-01");
			}
		}

		if (input.paymentMethodId) {
			expenseData.paymentMethodId = input.paymentMethodId;
		}

		// Link to subscription if provided
		if (input.subscriptionId) {
			expenseData.subscriptionId = input.subscriptionId;

			// Verify subscription exists and belongs to the same expense account
			const { getSubscriptionById, updateSubscription } = await import(
				"@repo/database"
			);
			const subscription = await getSubscriptionById(
				input.subscriptionId,
			);

			if (!subscription) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Subscription not found",
				});
			}

			if (subscription.expenseAccountId !== input.businessId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Subscription does not belong to this expense account",
				});
			}

			if (subscription.status !== "active") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Cannot add expenses to inactive subscription",
				});
			}

			// Calculate new renewal date based on payment date and renewal type
			const paymentDate = input.date;
			const renewalType = subscription.renewalType || "from_payment_date";
			const renewalFrequency = subscription.renewalFrequency || "monthly";

			// Update subscription
			const updateData: any = {};

			if (input.updateSubscriptionAmount) {
				updateData.currentAmount = input.amount;
			}

			// Always update renewal date if renewalType is "from_payment_date"
			if (renewalType === "from_payment_date") {
				// Calculate renewal date from payment date
				let newRenewalDate: Date;
				if (renewalFrequency === "monthly") {
					newRenewalDate = addMonths(paymentDate, 1);
				} else if (renewalFrequency === "yearly") {
					newRenewalDate = addYears(paymentDate, 1);
				} else if (renewalFrequency === "weekly") {
					newRenewalDate = addDays(paymentDate, 7);
				} else {
					newRenewalDate = addMonths(paymentDate, 1); // Default to monthly
				}

				// Ensure renewal date is not in the past
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const renewalDateToCheck = new Date(newRenewalDate);
				renewalDateToCheck.setHours(0, 0, 0, 0);

				if (renewalDateToCheck < today) {
					// If calculated date is in past, add another period
					if (renewalFrequency === "monthly") {
						newRenewalDate = addMonths(newRenewalDate, 1);
					} else if (renewalFrequency === "yearly") {
						newRenewalDate = addYears(newRenewalDate, 1);
					} else if (renewalFrequency === "weekly") {
						newRenewalDate = addDays(newRenewalDate, 7);
					}
				}

				updateData.renewalDate = newRenewalDate;
				updateData.nextReminderDate = addDays(
					newRenewalDate,
					-(subscription.reminderDays || 7),
				);
			} else if (input.updateSubscriptionRenewalDate) {
				// from_renewal_date: only update if manually specified
				updateData.renewalDate = input.updateSubscriptionRenewalDate;
				updateData.nextReminderDate = addDays(
					input.updateSubscriptionRenewalDate,
					-(subscription.reminderDays || 7),
				);
			}

			if (Object.keys(updateData).length > 0) {
				await updateSubscription({
					id: input.subscriptionId,
					...updateData,
				});
			}
		}

		const expense = await createExpense(expenseData);

		// Legacy: Create subscription if category is subscription and no subscriptionId provided
		// This is for backward compatibility during migration
		if (
			isSubscription &&
			!input.subscriptionId &&
			input.renewalFrequency &&
			input.renewalDate
		) {
			// Calculate next reminder date (7 days before renewal)
			const nextReminderDate = addDays(input.renewalDate, -7);

			const { createSubscription } = await import("@repo/database");
			await createSubscription({
				expenseAccountId: input.businessId,
				title: expenseData.title || `${category.name} Expense`,
				description: expenseData.description,
				currentAmount: input.amount,
				currency: expenseCurrency,
				startDate: input.date,
				renewalDate: input.renewalDate,
				renewalFrequency: input.renewalFrequency,
				autoRenew: true,
				reminderDays: 7,
				nextReminderDate,
				provider: input.provider,
				status: "active",
				expenseId: expense.id, // Legacy field
			});

			// Link expense to subscription
			await db.expense.update({
				where: { id: expense.id },
				data: {
					subscriptionId: (
						await db.subscription.findFirst({
							where: { expenseId: expense.id },
						})
					)?.id,
				},
			});
		}

		// Fetch expense with all relations
		const { getExpenseById } = await import("@repo/database");
		const fullExpense = await getExpenseById(expense.id);

		return fullExpense;
	});

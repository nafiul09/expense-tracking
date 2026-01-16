import { ORPCError } from "@orpc/server";
import { getSubscriptionById, updateSubscription } from "@repo/database";
import { addDays } from "date-fns";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";
import { fetchFavicon } from "../../lib/fetch-favicon";

export const updateSubscriptionProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/subscriptions/:id",
		tags: ["Expenses"],
		summary: "Update a subscription",
		description: "Update subscription details",
	})
	.input(
		z.object({
			id: z.string(),
			title: z.string().min(1).optional(),
			description: z.string().optional(),
			websiteUrl: z.string().url().optional().or(z.literal("")),
			websiteIcon: z.string().url().optional().or(z.literal("")),
			amount: z.number().positive().optional(), // Renamed from currentAmount
			currency: z.string().optional(),
			rateType: z.enum(["default", "custom"]).optional(),
			customRate: z.number().positive().optional(),
			renewalDate: z.coerce
				.date()
				.refine(
					(date) => {
						const today = new Date();
						today.setHours(0, 0, 0, 0);
						const dateToCheck = new Date(date);
						dateToCheck.setHours(0, 0, 0, 0);
						return dateToCheck >= today;
					},
					{
						message: "Renewal date cannot be in the past",
					},
				)
				.optional(),
			renewalFrequency: z
				.enum(["monthly", "yearly", "weekly"])
				.optional(),
			reminderDays: z.number().int().min(1).max(30).optional(),
			paymentMethodId: z.string().optional(),
			status: z.enum(["active", "inactive", "cancelled"]).optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, ...updateData } = input;

		const subscription = await getSubscriptionById(id);

		if (!subscription) {
			throw new ORPCError("NOT_FOUND", {
				message: "Subscription not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			subscription.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can update subscriptions
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can update subscriptions",
			});
		}

		// Validate renewal date is not in the past
		if (updateData.renewalDate) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const renewalDateToCheck = new Date(updateData.renewalDate);
			renewalDateToCheck.setHours(0, 0, 0, 0);

			if (renewalDateToCheck < today) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Renewal date cannot be in the past. Please select today or a future date.",
				});
			}
		}

		// Fetch favicon if website URL is provided and changed
		let websiteIcon: string | undefined | null;
		if (updateData.websiteUrl !== undefined) {
			if (updateData.websiteUrl) {
				websiteIcon = await fetchFavicon(updateData.websiteUrl);
			} else {
				websiteIcon = null;
			}
		}

		// If custom websiteIcon is provided, override the fetched one
		if (updateData.websiteIcon !== undefined) {
			if (updateData.websiteIcon) {
				websiteIcon = updateData.websiteIcon;
			} else if (updateData.websiteIcon === "") {
				websiteIcon = null;
			}
		}

		// Handle currency conversion if amount or currency changed
		let conversionRate: number | undefined;
		let baseCurrencyAmount: number | undefined;
		const rateType =
			updateData.rateType || subscription.rateType || "default";

		if (
			(updateData.amount !== undefined ||
				updateData.currency !== undefined) &&
			subscription.expenseAccount
		) {
			const { config } = await import("@repo/config");
			const { getCurrencyRatesByOrganization } = await import(
				"@repo/database"
			);
			const baseCurrency = config.expenses.defaultBaseCurrency;
			const expenseCurrency =
				updateData.currency || subscription.currency || baseCurrency;

			if (expenseCurrency !== baseCurrency) {
				if (rateType === "custom" && updateData.customRate) {
					conversionRate = updateData.customRate;
				} else {
					const currencyRates = await getCurrencyRatesByOrganization(
						subscription.expenseAccount.organizationId,
					);
					const rate = currencyRates.find(
						(r) => r.toCurrency === expenseCurrency,
					);

					if (rate) {
						conversionRate = Number(rate.rate);
					}
				}

				if (conversionRate) {
					const amount =
						updateData.amount ?? Number(subscription.amount);
					baseCurrencyAmount = amount / conversionRate;
				}
			} else {
				baseCurrencyAmount =
					updateData.amount ?? Number(subscription.amount);
			}
		}

		// Calculate next reminder date if renewalDate or reminderDays changed
		let nextReminderDate: Date | undefined;
		if (updateData.renewalDate || updateData.reminderDays !== undefined) {
			const renewalDate =
				updateData.renewalDate || subscription.renewalDate;
			const reminderDays =
				updateData.reminderDays ?? subscription.reminderDays;
			nextReminderDate = addDays(renewalDate, -reminderDays);
		}

		// Prepare update data
		const finalUpdateData: any = {
			...updateData,
			...(websiteIcon !== undefined && { websiteIcon }),
			...(conversionRate !== undefined && { conversionRate }),
			...(rateType && { rateType }),
			...(baseCurrencyAmount !== undefined && { baseCurrencyAmount }),
			...(nextReminderDate && { nextReminderDate }),
		};

		// Remove customRate from update data (it's only used for calculation)
		delete finalUpdateData.customRate;

		const updatedSubscription = await updateSubscription({
			id,
			...finalUpdateData,
		});

		return updatedSubscription;
	});

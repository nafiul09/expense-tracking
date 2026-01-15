import { ORPCError } from "@orpc/server";
import { getSubscriptionById, updateSubscription } from "@repo/database";
import { addDays } from "date-fns";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

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
			provider: z.string().optional(),
			currentAmount: z.number().positive().optional(),
			currency: z.string().optional(),
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
			renewalType: z
				.enum(["from_payment_date", "from_renewal_date"])
				.optional(),
			autoRenew: z.boolean().optional(),
			reminderDays: z.number().int().min(1).max(30).optional(),
			status: z.enum(["active", "inactive"]).optional(),
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

		// Calculate next reminder date if renewalDate or reminderDays changed
		let nextReminderDate: Date | undefined;
		if (updateData.renewalDate || updateData.reminderDays !== undefined) {
			const renewalDate =
				updateData.renewalDate || subscription.renewalDate;
			const reminderDays =
				updateData.reminderDays ?? subscription.reminderDays;
			nextReminderDate = addDays(renewalDate, -reminderDays);
		}

		const updatedSubscription = await updateSubscription({
			id,
			...updateData,
			...(nextReminderDate && { nextReminderDate }),
		});

		return updatedSubscription;
	});

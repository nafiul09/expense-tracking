import { ORPCError } from "@orpc/server";
import { getSubscriptionById, updateSubscription } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const updateReminderSettingsProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/subscriptions/:id/reminder-settings",
		tags: ["Expenses"],
		summary: "Update reminder settings",
		description: "Update subscription reminder preferences",
	})
	.input(
		z.object({
			id: z.string(),
			reminderDays: z.number().int().min(1).max(30).optional(),
			autoRenew: z.boolean().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, reminderDays, ...updateData } = input;

		const subscription = await getSubscriptionById(id);

		if (!subscription) {
			throw new ORPCError("NOT_FOUND", "Subscription not found");
		}

		const membership = await verifyOrganizationMembership(
			subscription.expense.business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		// Calculate next reminder date if reminderDays changed
		let nextReminderDate = subscription.nextReminderDate;
		if (reminderDays && reminderDays !== subscription.reminderDays) {
			nextReminderDate = new Date(subscription.renewalDate);
			nextReminderDate.setDate(nextReminderDate.getDate() - reminderDays);
		}

		const updatedSubscription = await updateSubscription({
			id,
			reminderDays,
			nextReminderDate,
			...updateData,
		});

		return updatedSubscription;
	});

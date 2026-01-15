import { ORPCError } from "@orpc/server";
import { deleteSubscription, getSubscriptionById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deleteSubscriptionProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/subscriptions/:id",
		tags: ["Expenses"],
		summary: "Delete a subscription",
		description:
			"Delete a subscription. This will unlink all expenses from the subscription but keep the expense records.",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id } = input;

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

		// Only owners and admins can delete subscriptions
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can delete subscriptions",
			});
		}

		await deleteSubscription(id);

		return { success: true };
	});

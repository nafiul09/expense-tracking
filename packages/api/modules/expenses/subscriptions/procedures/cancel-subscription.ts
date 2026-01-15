import { ORPCError } from "@orpc/server";
import { cancelSubscription, getSubscriptionById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const cancelSubscriptionProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/subscriptions/:id/cancel",
		tags: ["Expenses"],
		summary: "Cancel a subscription",
		description: "Cancel an active subscription",
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

		// Only owners and admins can cancel subscriptions
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can cancel subscriptions",
			});
		}

		const cancelledSubscription = await cancelSubscription(id);

		return cancelledSubscription;
	});

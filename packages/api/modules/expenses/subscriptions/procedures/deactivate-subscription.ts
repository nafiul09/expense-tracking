import { ORPCError } from "@orpc/server";
import { deactivateSubscription, getSubscriptionById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deactivateSubscriptionProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/subscriptions/:id/deactivate",
		tags: ["Expenses"],
		summary: "Deactivate a subscription",
		description:
			"Deactivate a subscription (prevents new expenses from being created)",
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

		// Only owners and admins can deactivate subscriptions
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can deactivate subscriptions",
			});
		}

		const deactivatedSubscription = await deactivateSubscription(id);

		return deactivatedSubscription;
	});

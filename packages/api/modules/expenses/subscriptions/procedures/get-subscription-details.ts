import { ORPCError } from "@orpc/server";
import { getSubscriptionById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getSubscriptionDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/subscriptions/:id",
		tags: ["Expenses"],
		summary: "Get subscription details",
		description: "Get detailed information about a subscription",
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
			throw new ORPCError("NOT_FOUND", { message: "Subscription not found" });
		}

		const membership = await verifyOrganizationMembership(
			subscription.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		return subscription;
	});

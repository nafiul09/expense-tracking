import { ORPCError } from "@orpc/server";
import { getBusinessById, getSubscriptionsByBusinessId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listSubscriptionsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/subscriptions",
		tags: ["Expenses"],
		summary: "List subscriptions",
		description: "List all subscriptions for a business",
	})
	.input(
		z.object({
			businessId: z.string(),
			status: z
				.enum(["active", "inactive", "cancelled", "paused"])
				.optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, status } = input;

		const business = await getBusinessById(businessId);

		if (!business) {
			throw new ORPCError("BAD_REQUEST", { message: "Business not found" });
		}

		const membership = await verifyOrganizationMembership(
			business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		const subscriptions = await getSubscriptionsByBusinessId(
			businessId,
			status,
		);

		return subscriptions;
	});

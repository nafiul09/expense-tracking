import { ORPCError } from "@orpc/server";
import { getAllSubscriptionsByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listAllSubscriptionsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/subscriptions/all",
		tags: ["Expenses"],
		summary: "List all subscriptions across all expense accounts",
		description: "List subscriptions across all expense accounts for an organization with optional filters",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			status: z.enum(["active", "cancelled", "paused"]).optional(),
			renewalFrequency: z.string().optional(),
			nextRenewalStart: z.coerce.date().optional(),
			nextRenewalEnd: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, ...options } = input;

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const subscriptions = await getAllSubscriptionsByOrganizationId(
			organizationId,
			options,
		);

		return subscriptions;
	});

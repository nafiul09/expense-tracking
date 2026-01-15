import { ORPCError } from "@orpc/server";
import { getBusinessById, getUpcomingRenewals } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getUpcomingRenewalsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/subscriptions/upcoming-renewals",
		tags: ["Expenses"],
		summary: "Get upcoming renewals",
		description: "Get subscriptions due for renewal within specified days",
	})
	.input(
		z.object({
			businessId: z.string(),
			days: z.number().int().positive().max(90).default(30),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, days } = input;

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

		const renewals = await getUpcomingRenewals(businessId, days);

		return renewals;
	});

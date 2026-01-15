import { ORPCError } from "@orpc/server";
import { getBusinessById, getTeamMemberExpenseSummary } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getTeamMemberExpenseSummaryProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/analytics/team-member-summary",
		tags: ["Expenses"],
		summary: "Get team member expense summary",
		description: "Get expense summary by team member",
	})
	.input(
		z.object({
			businessId: z.string(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, startDate, endDate } = input;

		const business = await getBusinessById(businessId);

		if (!business) {
			throw new ORPCError("BAD_REQUEST", "Business not found");
		}

		const membership = await verifyOrganizationMembership(
			business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const summary = await getTeamMemberExpenseSummary(
			businessId,
			startDate,
			endDate,
		);

		return summary;
	});

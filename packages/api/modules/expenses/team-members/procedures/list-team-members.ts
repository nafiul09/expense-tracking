import { ORPCError } from "@orpc/server";
import { getBusinessById, getTeamMembersByBusinessId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listTeamMembersProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/team-members",
		tags: ["Expenses"],
		summary: "List team members",
		description: "List all team members for a business",
	})
	.input(
		z.object({
			businessId: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId } = input;

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

		const teamMembers = await getTeamMembersByBusinessId(businessId);

		return teamMembers;
	});

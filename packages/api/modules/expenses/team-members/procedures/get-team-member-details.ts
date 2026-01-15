import { ORPCError } from "@orpc/server";
import {
	getExpensesByBusinessId,
	getLoansByBusinessId,
	getTeamMemberById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getTeamMemberDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/team-members/:id",
		tags: ["Expenses"],
		summary: "Get team member details",
		description:
			"Get detailed information about a team member including salary history and loans",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id } = input;

		const teamMember = await getTeamMemberById(id);

		if (!teamMember) {
			throw new ORPCError("NOT_FOUND", "Team member not found");
		}

		const membership = await verifyOrganizationMembership(
			teamMember.business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		// Get loans for this team member
		const loans = await getLoansByBusinessId(
			teamMember.businessId,
			undefined,
			id,
		);

		// Get expenses related to this team member
		const expenses = await getExpensesByBusinessId(teamMember.businessId, {
			teamMemberId: id,
		});

		return {
			...teamMember,
			loans,
			expenses,
		};
	});

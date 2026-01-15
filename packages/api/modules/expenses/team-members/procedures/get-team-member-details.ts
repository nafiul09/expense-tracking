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
			throw new ORPCError("NOT_FOUND", {
				message: "Team member not found",
			});
		}

		if (!teamMember.expenseAccount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Team member not associated with an expense account",
			});
		}

		const membership = await verifyOrganizationMembership(
			teamMember.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Get loans for this team member
		// Note: teamMember.businessId is deprecated, use expenseAccount relation instead
		const expenseAccountId = teamMember.expenseAccount?.id;
		const loans = expenseAccountId
			? await getLoansByBusinessId(expenseAccountId, undefined, id)
			: [];

		// Get expenses related to this team member
		const expenses = expenseAccountId
			? await getExpensesByBusinessId(expenseAccountId, {
					teamMemberId: id,
				})
			: [];

		return {
			...teamMember,
			loans,
			expenses,
		};
	});

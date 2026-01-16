import { ORPCError } from "@orpc/server";
import { getExpensesByBusinessId, getTeamMemberById } from "@repo/database";
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
			"Get detailed information about a team member including salary payment history",
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

		// Get salary expenses for this team member
		const expenseAccountId = teamMember.expenseAccount?.id;
		const expenses = expenseAccountId
			? await getExpensesByBusinessId(expenseAccountId, {
					teamMemberId: id,
				})
			: [];

		return {
			...teamMember,
			expenses,
		};
	});

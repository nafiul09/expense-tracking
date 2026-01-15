import { ORPCError } from "@orpc/server";
import { deleteTeamMember, getTeamMemberById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deleteTeamMemberProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/team-members/:id",
		tags: ["Expenses"],
		summary: "Delete a team member",
		description: "Delete a team member",
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

		// Only owners and admins can delete team members
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can delete team members",
			});
		}

		await deleteTeamMember(id);

		return { success: true };
	});

import { ORPCError } from "@orpc/server";
import { getTeamMemberById, updateTeamMember } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const updateTeamMemberProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/team-members/:id",
		tags: ["Expenses"],
		summary: "Update a team member",
		description: "Update team member details",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().min(1).max(255).optional(),
			email: z.string().email().optional().nullable(),
			position: z.string().optional().nullable(),
			joinedDate: z.coerce.date().optional().nullable(),
			salary: z.number().nonnegative().optional().nullable(),
			status: z.enum(["active", "inactive"]).optional(),
			notes: z.string().optional().nullable(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, ...updateData } = input;

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

		// Only owners and admins can update team members
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can update team members",
			});
		}

		const updatedTeamMember = await updateTeamMember({
			id,
			...updateData,
		});

		return updatedTeamMember;
	});

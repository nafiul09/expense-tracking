import { ORPCError } from "@orpc/server";
import { getAllTeamMembersByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listAllTeamMembersProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/team-members/all",
		tags: ["Expenses"],
		summary: "List all team members across all expense accounts",
		description: "List team members across all expense accounts for an organization with optional filters",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			status: z.string().optional(),
			search: z.string().optional(),
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

		const teamMembers = await getAllTeamMembersByOrganizationId(
			organizationId,
			options,
		);

		return teamMembers;
	});

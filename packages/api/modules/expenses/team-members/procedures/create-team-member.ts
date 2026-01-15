import { ORPCError } from "@orpc/server";
import { createTeamMember, getBusinessById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createTeamMemberProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/team-members",
		tags: ["Expenses"],
		summary: "Create a new team member",
		description: "Add a team member to a business",
	})
	.input(
		z.object({
			businessId: z.string(),
			name: z.string().min(1).max(255),
			email: z.string().email().optional(),
			position: z.string().optional(),
			joinedDate: z.coerce.date().optional(),
			salary: z.number().nonnegative().optional(),
			status: z.enum(["active", "inactive"]).default("active"),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, ...data } = input;

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

		// Only owners and admins can create team members
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can create team members",
			);
		}

		const teamMember = await createTeamMember({
			businessId,
			...data,
		});

		return teamMember;
	});

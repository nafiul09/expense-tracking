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
			businessId: z.string().optional(), // Deprecated, use accountAssociations instead
			name: z.string().min(1).max(255),
			email: z.string().email().optional(),
			position: z.string().optional(),
			joinedDate: z.coerce.date().optional(),
			salary: z.number().nonnegative().optional(),
			status: z.enum(["active", "inactive"]).default("active"),
			notes: z.string().optional(),
			accountAssociations: z
				.array(
					z.object({
						accountId: z.string(),
						position: z.string().optional(),
						joinedDate: z.coerce.date().optional(),
						salary: z.number().nonnegative().optional(),
					}),
				)
				.optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, accountAssociations, ...data } = input;

		// Validate organization membership
		let organizationId: string;
		if (accountAssociations && accountAssociations.length > 0) {
			// Verify all accounts belong to the same organization
			const firstAccount = await getBusinessById(accountAssociations[0].accountId);
			if (!firstAccount) {
				throw new ORPCError("BAD_REQUEST", "Account not found");
			}
			organizationId = firstAccount.organizationId;

			// Verify membership
			const membership = await verifyOrganizationMembership(
				organizationId,
				user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
			}

			// Verify all accounts belong to same organization
			for (const assoc of accountAssociations) {
				const account = await getBusinessById(assoc.accountId);
				if (!account) {
					throw new ORPCError("BAD_REQUEST", `Account ${assoc.accountId} not found`);
				}
				if (account.organizationId !== organizationId) {
					throw new ORPCError(
						"BAD_REQUEST",
						"All accounts must belong to the same organization",
					);
				}
			}
		} else if (businessId) {
			// Legacy support: single businessId
			const business = await getBusinessById(businessId);
			if (!business) {
				throw new ORPCError("BAD_REQUEST", "Business not found");
			}
			organizationId = business.organizationId;

			const membership = await verifyOrganizationMembership(
				organizationId,
				user.id,
			);
			if (!membership) {
				throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
			}
		} else {
			throw new ORPCError(
				"BAD_REQUEST",
				"Either businessId or accountAssociations must be provided",
			);
		}

		// Only owners and admins can create team members
		const membership = await verifyOrganizationMembership(organizationId, user.id);
		if (membership && membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can create team members",
			);
		}

		const teamMember = await createTeamMember({
			businessId,
			...data,
			accountAssociations,
		});

		return teamMember;
	});

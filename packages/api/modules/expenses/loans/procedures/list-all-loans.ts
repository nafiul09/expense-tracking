import { ORPCError } from "@orpc/server";
import { getAllLoansByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listAllLoansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans/all",
		tags: ["Expenses"],
		summary: "List all loans across all expense accounts",
		description: "List loans across all expense accounts for an organization with optional filters",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			teamMemberIds: z.array(z.string()).optional(),
			status: z.enum(["active", "paid", "partial"]).optional(),
			loanDateStart: z.coerce.date().optional(),
			loanDateEnd: z.coerce.date().optional(),
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

		const loans = await getAllLoansByOrganizationId(organizationId, options);

		return loans;
	});

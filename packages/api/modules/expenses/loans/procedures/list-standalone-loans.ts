import { getAllStandaloneLoansByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listStandaloneLoansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans/standalone",
		tags: ["Expenses"],
		summary: "List all standalone loans",
		description: "Get all standalone loans for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			teamMemberIds: z.array(z.string()).optional(),
			status: z.string().optional(),
			loanDateStart: z.coerce.date().optional(),
			loanDateEnd: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const membership = await verifyOrganizationMembership(
			input.organizationId,
			user.id,
		);

		if (!membership) {
			throw new Error("Not a member of this workspace");
		}

		const loans = await getAllStandaloneLoansByOrganizationId(
			input.organizationId,
			{
				accountIds: input.accountIds,
				teamMemberIds: input.teamMemberIds,
				status: input.status,
				loanDateStart: input.loanDateStart,
				loanDateEnd: input.loanDateEnd,
			},
		);

		return loans;
	});

import { getAllLoansByOrganizationId } from "@repo/database";
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

		const loans = await getAllLoansByOrganizationId(
			input.organizationId,
			{
				accountIds: input.accountIds,
				loanType: "team_member", // Filter for team member loans (standalone loans)
				status: input.status,
				startDate: input.loanDateStart,
				endDate: input.loanDateEnd,
			},
		);

		return loans;
	});

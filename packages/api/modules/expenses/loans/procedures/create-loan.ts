import { ORPCError } from "@orpc/server";
import { createLoan, getExpenseById, getTeamMemberById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createLoanProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans",
		tags: ["Expenses"],
		summary: "Create a new loan",
		description: "Create a loan for a team member",
	})
	.input(
		z.object({
			expenseId: z.string(),
			teamMemberId: z.string(),
			principalAmount: z.number().positive(),
			loanDate: z.coerce.date(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { expenseId, teamMemberId, principalAmount, loanDate, notes } =
			input;

		const expense = await getExpenseById(expenseId);

		if (!expense) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Expense not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			expense.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		const teamMember = await getTeamMemberById(teamMemberId);

		if (!teamMember) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Team member not found",
			});
		}

		if (teamMember.businessId !== expense.businessId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Team member does not belong to this business",
			});
		}

		const loan = await createLoan({
			expenseId,
			teamMemberId,
			principalAmount,
			remainingAmount: principalAmount,
			loanDate,
			notes,
			status: "active",
		});

		return loan;
	});

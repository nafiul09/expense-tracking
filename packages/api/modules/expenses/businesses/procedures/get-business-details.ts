import { ORPCError } from "@orpc/server";
import { getExpenseAccountById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getExpenseAccountDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/expense-accounts/:id",
		tags: ["Expenses"],
		summary: "Get expense account details",
		description: "Get detailed information about an expense account",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id } = input;

		const expenseAccount = await getExpenseAccountById(id);

		if (!expenseAccount) {
			throw new ORPCError("NOT_FOUND", "Expense account not found");
		}

		const membership = await verifyOrganizationMembership(
			expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		return expenseAccount;
	});

import { ORPCError } from "@orpc/server";
import { deleteExpenseAccount, getExpenseAccountById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deleteExpenseAccountProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/expense-accounts/:id",
		tags: ["Expenses"],
		summary: "Delete an expense account",
		description: "Delete an expense account and all associated data",
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
			throw new ORPCError("NOT_FOUND", {
				message: "Expense account not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can delete expense accounts
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can delete expense accounts",
			});
		}

		await deleteExpenseAccount(id);

		return { success: true };
	});

import { ORPCError } from "@orpc/server";
import { deleteExpense, getExpenseById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const deleteExpenseProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/:id",
		tags: ["Expenses"],
		summary: "Delete an expense",
		description: "Delete an expense entry",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id } = input;

		const expense = await getExpenseById(id);

		if (!expense) {
			throw new ORPCError("NOT_FOUND", "Expense not found");
		}

		const membership = await verifyOrganizationMembership(
			expense.business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		// Only owners and admins can delete expenses
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can delete expenses",
			);
		}

		await deleteExpense(id);

		return { success: true };
	});

import { ORPCError } from "@orpc/server";
import { getExpenseAccountById, updateExpenseAccount } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const updateExpenseAccountProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/expense-accounts/:id",
		tags: ["Expenses"],
		summary: "Update an expense account",
		description: "Update expense account details",
	})
	.input(
		z.object({
			id: z.string(),
			name: z.string().min(1).max(255).optional(),
			description: z.string().optional(),
			currency: z.string().optional(),
			type: z.enum(["personal", "business"]).optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, ...updateData } = input;

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

		// Only owners and admins can update expense accounts
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can update expense accounts",
			});
		}

		const updatedExpenseAccount = await updateExpenseAccount({
			id,
			...updateData,
		});

		return updatedExpenseAccount;
	});

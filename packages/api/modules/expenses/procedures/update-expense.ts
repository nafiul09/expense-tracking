import { ORPCError } from "@orpc/server";
import { getExpenseById, updateExpense } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const updateExpenseProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/:id",
		tags: ["Expenses"],
		summary: "Update an expense",
		description: "Update expense details",
	})
	.input(
		z.object({
			id: z.string(),
			categoryId: z.string().optional(),
			expenseType: z.enum(["subscription", "team_salary", "one_time"]).optional(),
			teamMemberId: z.string().optional().nullable(),
			paymentMethodId: z.string().optional().nullable(),
			title: z.string().min(1).max(255).optional(),
			description: z.string().optional().nullable(),
			amount: z.number().positive().optional(),
			currency: z.string().optional(),
			date: z.coerce.date().optional(),
			receiptUrl: z.string().url().optional().nullable(),
			status: z.string().optional(),
			metadata: z.record(z.string(), z.any()).optional(),
			subscriptionId: z.string().optional().nullable(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, ...updateData } = input;

		const expense = await getExpenseById(id);

		if (!expense) {
			throw new ORPCError("NOT_FOUND", { message: "Expense not found" });
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

		// Only owners and admins can update expenses
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can update expenses",
			});
		}

		// Convert metadata to Prisma-compatible format if present
		const updatePayload: any = {
			id,
			...updateData,
		};
		if (updatePayload.metadata !== undefined) {
			updatePayload.metadata = updatePayload.metadata as any;
		}

		const updatedExpense = await updateExpense(updatePayload);

		return updatedExpense;
	});

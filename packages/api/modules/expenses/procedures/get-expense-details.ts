import { ORPCError } from "@orpc/server";
import { getExpenseById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const getExpenseDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/:id",
		tags: ["Expenses"],
		summary: "Get expense details",
		description: "Get detailed information about an expense",
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

		return expense;
	});

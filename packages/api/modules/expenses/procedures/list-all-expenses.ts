import { ORPCError } from "@orpc/server";
import { getAllExpensesByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const listAllExpensesProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/all",
		tags: ["Expenses"],
		summary: "List all expenses across all expense accounts",
		description: "List expenses across all expense accounts for an organization with optional filters",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			expenseType: z.enum(["subscription", "team_salary", "one_time"]).optional(),
			teamMemberId: z.string().optional(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
			status: z.string().optional(),
			search: z.string().optional(),
			limit: z.number().int().positive().max(100).default(50),
			offset: z.number().int().nonnegative().default(0),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, ...options } = input;

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		const result = await getAllExpensesByOrganizationId(organizationId, options);

		return result;
	});

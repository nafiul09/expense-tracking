import { ORPCError } from "@orpc/server";
import { getBusinessById, getLoansByExpenseAccountId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listLoansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans",
		tags: ["Expenses"],
		summary: "List loans",
		description: "List loans for an expense account with optional filters",
	})
	.input(
		z.object({
			businessId: z.string(),
			loanType: z.enum(["given", "taken"]).optional(),
			status: z.string().optional(),
			partyName: z.string().optional(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
			limit: z.number().int().positive().max(100).default(50),
			offset: z.number().int().nonnegative().default(0),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, ...options } = input;

		const business = await getBusinessById(businessId);

		if (!business) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Expense account not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		const loans = await getLoansByExpenseAccountId(businessId, options);

		return loans;
	});

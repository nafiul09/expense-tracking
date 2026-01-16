import { ORPCError } from "@orpc/server";
import { getLoanById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getLoanDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans/:id",
		tags: ["Expenses"],
		summary: "Get loan details",
		description: "Get a single loan with payment history",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const loan = await getLoanById(input.id);

		if (!loan) {
			throw new ORPCError("NOT_FOUND", {
				message: "Loan not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			loan.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		return loan;
	});

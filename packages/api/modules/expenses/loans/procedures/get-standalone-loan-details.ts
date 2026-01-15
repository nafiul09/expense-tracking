import { ORPCError } from "@orpc/server";
import {
	getStandaloneLoanById,
	getStandaloneLoanPayments,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getStandaloneLoanDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans/standalone/:id",
		tags: ["Expenses"],
		summary: "Get standalone loan details",
		description: "Get loan details with payment history",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const loan = await getStandaloneLoanById(input.id);

		if (!loan) {
			throw new ORPCError("NOT_FOUND", { message: "Loan not found" });
		}

		const membership = await verifyOrganizationMembership(
			loan.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		const payments = await getStandaloneLoanPayments(input.id);

		return {
			...loan,
			payments,
		};
	});

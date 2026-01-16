import { ORPCError } from "@orpc/server";
import { deleteLoan, getLoanById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deleteLoanProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/loans/:id",
		tags: ["Expenses"],
		summary: "Delete a loan",
		description: "Permanently delete a loan record",
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

		// Only owners and admins can delete loans
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can delete loans",
			});
		}

		const deletedLoan = await deleteLoan(input.id);

		return deletedLoan;
	});

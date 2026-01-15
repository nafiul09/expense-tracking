import { ORPCError } from "@orpc/server";
import { cancelStandaloneLoan, getStandaloneLoanById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const cancelStandaloneLoanProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans/standalone/:id/cancel",
		tags: ["Expenses"],
		summary: "Cancel standalone loan",
		description: "Cancel a standalone loan (sets status to cancelled)",
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
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can cancel loans
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can cancel loans",
			});
		}

		const cancelledLoan = await cancelStandaloneLoan(input.id);

		return cancelledLoan;
	});

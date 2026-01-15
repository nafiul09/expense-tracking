import { ORPCError } from "@orpc/server";
import { addLoanPayment, getLoanById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const addLoanPaymentProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans/:id/payments",
		tags: ["Expenses"],
		summary: "Add loan payment",
		description: "Record a payment towards a loan",
	})
	.input(
		z.object({
			id: z.string(),
			amount: z.number().positive(),
			paymentDate: z.coerce.date(),
			paymentMethod: z.string().optional(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, amount, paymentDate, paymentMethod, notes } = input;

		const loan = await getLoanById(id);

		if (!loan) {
			throw new ORPCError("NOT_FOUND", { message: "Loan not found" });
		}

		const membership = await verifyOrganizationMembership(
			loan.expense.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can record payments
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can record loan payments",
			});
		}

		if (Number(loan.remainingAmount) < amount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Payment amount exceeds remaining loan amount",
			});
		}

		const payment = await addLoanPayment({
			loanId: id,
			amount,
			paymentDate,
			paymentMethod,
			notes,
			recordedBy: user.id,
		});

		return payment;
	});

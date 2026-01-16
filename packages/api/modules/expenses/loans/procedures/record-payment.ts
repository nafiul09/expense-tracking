import { ORPCError } from "@orpc/server";
import {
	addLoanPayment,
	getCurrencyRatesByOrganization,
	getLoanById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const recordLoanPaymentProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans/:id/payments",
		tags: ["Expenses"],
		summary: "Record a loan payment",
		description: "Record a payment on a loan",
	})
	.input(
		z.object({
			id: z.string(),
			amount: z.number().positive(),
			currency: z.string().default("USD"),
			rateType: z.enum(["default", "custom"]).default("default").optional(),
			customRate: z.number().positive().optional(),
			paymentDate: z.coerce.date(),
			paymentType: z.enum(["principal", "interest", "both"]).default("principal"),
			notes: z.string().optional(),
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

		// Only owners and admins can record payments
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can record loan payments",
			});
		}

		// Handle currency conversion if payment currency differs from loan currency
		let conversionRate: number | undefined;
		let paymentAmount = input.amount;

		if (input.currency !== loan.currency) {
			const rates = await getCurrencyRatesByOrganization(
				loan.expenseAccount.organizationId,
			);

			const rate =
				input.rateType === "custom" && input.customRate
					? input.customRate
					: rates.find((r) => r.toCurrency === input.currency)?.rate;

			if (!rate) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Conversion rate not found for ${input.currency}. Please set up the currency rate in workspace settings or use a custom rate.`,
				});
			}

			conversionRate = Number(rate);

			// Convert payment amount to loan currency
			// Payment currency -> USD -> Loan currency
			let amountInUSD = input.amount;
			if (input.currency !== "USD") {
				amountInUSD = input.amount * conversionRate;
			}

			const loanCurrencyRate = rates.find(
				(r) => r.toCurrency === loan.currency,
			)?.rate;

			if (loan.currency !== "USD" && loanCurrencyRate) {
				paymentAmount = amountInUSD / Number(loanCurrencyRate);
			} else {
				paymentAmount = amountInUSD;
			}
		}

		const payment = await addLoanPayment({
			loanId: input.id,
			amount: paymentAmount,
			currency: input.currency,
			conversionRate,
			paymentDate: input.paymentDate,
			paymentType: input.paymentType,
			notes: input.notes,
			recordedBy: user.id,
		});

		// Fetch updated loan
		const updatedLoan = await getLoanById(input.id);

		return {
			payment,
			loan: updatedLoan,
		};
	});

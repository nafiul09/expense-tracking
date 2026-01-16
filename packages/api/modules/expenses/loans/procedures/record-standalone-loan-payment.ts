import { ORPCError } from "@orpc/server";
import {
	getLoanById,
	addLoanPayment,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const recordStandaloneLoanPaymentProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans/standalone/:id/payments",
		tags: ["Expenses"],
		summary: "Record loan payment",
		description: "Record a payment towards a standalone loan",
	})
	.input(
		z.object({
			id: z.string(),
			amount: z.number().positive(),
			currency: z.string().min(1),
			conversionRate: z.number().positive().optional(), // Custom rate from payment currency to USD (if provided)
			paymentDate: z.coerce.date(),
			paymentType: z.enum(["principal", "interest", "both"]).optional(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const {
			id,
			amount,
			currency,
			conversionRate,
			paymentDate,
			paymentType,
			notes,
		} = input;

		const loan = await getLoanById(id);

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

		// Only owners and admins can record payments
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can record loan payments",
			});
		}

		// Multi-step currency conversion: Payment Currency → USD → Account Currency
		// Loan balance is stored in account currency, so payment must be converted
		const { getCurrencyRatesByOrganization } = await import(
			"@repo/database"
		);
		const rates = await getCurrencyRatesByOrganization(
			loan.expenseAccount.organizationId,
		);

		const accountCurrency = loan.expenseAccount.currency || "USD";
		let amountInUSD = amount;
		let finalPaymentAmount = amount;
		let paymentConversionRate: number | undefined;

		// Step 1: Convert payment currency to USD (if not already USD)
		if (currency !== "USD") {
			const inputToUSDRate = conversionRate
				? conversionRate
				: rates.find((r) => r.toCurrency === currency)?.rate;

			if (!inputToUSDRate) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Conversion rate not found for ${currency}. Please set up the currency rate in workspace settings or provide a custom rate.`,
				});
			}

			paymentConversionRate = Number(inputToUSDRate);
			amountInUSD = amount * paymentConversionRate;
		}

		// Step 2: Convert USD to account currency (if not already USD)
		if (accountCurrency !== "USD") {
			const usdToAccountRate = rates.find(
				(r) => r.toCurrency === accountCurrency,
			)?.rate;

			if (!usdToAccountRate) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Conversion rate not found for ${accountCurrency}. Please set up the currency rate in workspace settings.`,
				});
			}

			finalPaymentAmount = amountInUSD * Number(usdToAccountRate);
		} else {
			finalPaymentAmount = amountInUSD;
		}

		const currentBalance = Number(loan.currentBalance);

		if (finalPaymentAmount > currentBalance) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Payment amount exceeds current loan balance",
			});
		}

		const payment = await addLoanPayment({
			loanId: id,
			amount: finalPaymentAmount, // Store converted amount in account currency
			currency, // Original payment currency (for reference)
			conversionRate: paymentConversionRate, // Rate from payment currency to USD
			paymentDate,
			paymentType: paymentType || "principal",
			notes,
			recordedBy: user.id,
		});

		return payment;
	});

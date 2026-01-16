import { ORPCError } from "@orpc/server";
import {
	createLoan,
	getCurrencyRatesByOrganization,
	getExpenseAccountById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createLoanProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans",
		tags: ["Expenses"],
		summary: "Create a new loan",
		description: "Create a generic loan (given or taken)",
	})
	.input(
		z.object({
			expenseAccountId: z.string(),
			loanType: z.enum(["given", "taken"]),
			partyName: z.string().min(1),
			partyContact: z.string().optional(),
			amount: z.number().positive(),
			currency: z.string().default("USD"),
			rateType: z
				.enum(["default", "custom"])
				.default("default")
				.optional(),
			customRate: z.number().positive().optional(),
			interestRate: z.number().nonnegative().optional(),
			interestType: z.enum(["simple", "compound"]).optional(),
			loanDate: z.coerce.date(),
			dueDate: z.coerce.date().optional(),
			collateral: z.string().optional(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const expenseAccount = await getExpenseAccountById(
			input.expenseAccountId,
		);

		if (!expenseAccount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Expense account not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can create loans
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can create loans",
			});
		}

		// Multi-step currency conversion: Input Currency → USD → Account Currency
		const rates = await getCurrencyRatesByOrganization(
			expenseAccount.organizationId,
		);

		const accountCurrency = expenseAccount.currency || "USD";
		let amountInUSD = input.amount;
		let finalAmount = input.amount;
		let conversionRate: number | undefined;
		let baseCurrencyAmount: number | undefined;

		// Step 1: Convert input currency to USD (if not already USD)
		if (input.currency !== "USD") {
			const inputToUSDRate =
				input.rateType === "custom" && input.customRate
					? input.customRate
					: rates.find((r) => r.toCurrency === input.currency)?.rate;

			if (!inputToUSDRate) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Conversion rate not found for ${input.currency}. Please set up the currency rate in workspace settings or use a custom rate.`,
				});
			}

			conversionRate = Number(inputToUSDRate);
			// Rate means "1 USD = conversionRate * inputCurrency"
			// So to convert FROM inputCurrency TO USD: divide
			amountInUSD = input.amount / conversionRate;
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

			finalAmount = amountInUSD * Number(usdToAccountRate);
		} else {
			finalAmount = amountInUSD;
		}

		// Store amounts: principalAmount and currentBalance in account currency for balance consistency
		const loan = await createLoan({
			expenseAccountId: input.expenseAccountId,
			loanType: input.loanType,
			partyName: input.partyName,
			partyContact: input.partyContact,
			principalAmount: finalAmount, // Store in account currency
			currentBalance: finalAmount, // Store in account currency
			currency: input.currency, // Original input currency (for reference)
			conversionRate, // Rate from input currency to USD
			rateType: input.rateType || "default",
			baseCurrencyAmount: amountInUSD, // Amount in USD (intermediate step)
			interestRate: input.interestRate,
			interestType: input.interestType,
			loanDate: input.loanDate,
			dueDate: input.dueDate,
			collateral: input.collateral,
			notes: input.notes,
			status: "active",
			createdBy: user.id,
		});

		return loan;
	});

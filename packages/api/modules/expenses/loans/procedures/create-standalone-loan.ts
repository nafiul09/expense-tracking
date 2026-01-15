import { ORPCError } from "@orpc/server";
import {
	createStandaloneLoan,
	getExpenseAccountById,
	getTeamMemberById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createStandaloneLoanProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/loans/standalone",
		tags: ["Expenses"],
		summary: "Create a new standalone loan",
		description: "Create a loan for a team member (not tied to an expense)",
	})
	.input(
		z.object({
			teamMemberId: z.string(),
			businessId: z.string(),
			amount: z.number().positive(),
			currency: z.string().default("USD"),
			rateType: z.enum(["default", "custom"]).optional(),
			customRate: z.number().positive().optional(),
			loanDate: z.coerce.date(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const {
			teamMemberId,
			businessId,
			amount,
			currency,
			rateType,
			customRate,
			loanDate,
			notes,
		} = input;

		const expenseAccount = await getExpenseAccountById(businessId);

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

		const teamMember = await getTeamMemberById(teamMemberId);

		if (!teamMember) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Team member not found",
			});
		}

		// Check if team member is associated with this expense account
		const isAssociated = teamMember.accounts?.some(
			(acc) => acc.accountId === businessId,
		);

		if (!isAssociated && teamMember.businessId !== businessId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Team member is not associated with this expense account",
			});
		}

		// Multi-step currency conversion: Input Currency → USD → Account Currency
		const { getCurrencyRatesByOrganization } = await import(
			"@repo/database"
		);
		const rates = await getCurrencyRatesByOrganization(
			expenseAccount.organizationId,
		);

		const accountCurrency = expenseAccount.currency || "USD";
		let amountInUSD = amount;
		let finalAmount = amount;
		let conversionRate: number | undefined;
		let baseCurrencyAmount: number | undefined;

		// Step 1: Convert input currency to USD (if not already USD)
		if (currency !== "USD") {
			const inputToUSDRate =
				rateType === "custom" && customRate
					? customRate
					: rates.find((r) => r.toCurrency === currency)?.rate;

			if (!inputToUSDRate) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Conversion rate not found for ${currency}. Please set up the currency rate in workspace settings or use a custom rate.`,
				});
			}

			conversionRate = Number(inputToUSDRate);
			amountInUSD = amount * conversionRate;
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
		// currency stores the original input currency for reference
		// baseCurrencyAmount stores the amount in USD (intermediate conversion step)
		const loan = await createStandaloneLoan({
			teamMemberId,
			businessId,
			principalAmount: finalAmount, // Store in account currency for balance tracking
			currentBalance: finalAmount, // Store in account currency for balance tracking
			currency, // Original input currency (for reference)
			conversionRate, // Rate from input currency to USD
			rateType: rateType || "default",
			baseCurrencyAmount: amountInUSD, // Amount in USD (intermediate step)
			loanDate,
			notes,
			status: "active",
			createdBy: user.id,
		});

		return loan;
	});

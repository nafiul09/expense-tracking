import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpense,
	getCurrencyRatesByOrganization,
	getExpenseAccountById,
	getExpenseCategoryById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const createExpenseProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses",
		tags: ["Expenses"],
		summary: "Create a new expense",
		description: "Create a new expense entry",
	})
	.input(
		z.object({
			businessId: z.string(),
			categoryId: z.string(),
			teamMemberId: z.string().optional(),
			paymentMethodId: z.string().optional(),
			title: z.string().min(1).max(255),
			description: z.string().optional(),
			amount: z.number().positive(),
			currency: z.string().default("USD"),
			rateType: z
				.enum(["default", "custom"])
				.default("default")
				.optional(),
			customRate: z.number().positive().optional(),
			date: z.coerce.date(),
			receiptUrl: z.string().url().optional(),
			status: z.string().default("active"),
			metadata: z.record(z.any()).optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const expenseAccount = await getExpenseAccountById(input.businessId);

		if (!expenseAccount) {
			throw new ORPCError("BAD_REQUEST", "Expense account not found");
		}

		const membership = await verifyOrganizationMembership(
			expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const category = await getExpenseCategoryById(input.categoryId);

		if (!category) {
			throw new ORPCError("BAD_REQUEST", "Category not found");
		}

		if (category.organizationId !== expenseAccount.organizationId) {
			throw new ORPCError(
				"BAD_REQUEST",
				"Category does not belong to this workspace",
			);
		}

		const baseCurrency = config.expenses.defaultBaseCurrency;
		const expenseCurrency =
			input.currency || expenseAccount.currency || baseCurrency;
		const rateType = input.rateType || "default";

		let conversionRate: number | undefined;
		let baseCurrencyAmount: number | undefined;

		// If expense currency is different from base currency, calculate conversion
		if (expenseCurrency !== baseCurrency) {
			if (rateType === "custom" && input.customRate) {
				// Use custom rate provided by user
				conversionRate = input.customRate;
			} else {
				// Use default rate from organization settings
				const currencyRates = await getCurrencyRatesByOrganization(
					expenseAccount.organizationId,
				);
				const rate = currencyRates.find(
					(r) => r.toCurrency === expenseCurrency,
				);

				if (!rate) {
					throw new ORPCError(
						"BAD_REQUEST",
						`Conversion rate not found for ${expenseCurrency}. Please set up the currency rate in workspace settings or use a custom rate.`,
					);
				}

				conversionRate = Number(rate.rate);
			}

			// Calculate base currency amount
			baseCurrencyAmount = input.amount / conversionRate;
		} else {
			// Same currency, no conversion needed
			baseCurrencyAmount = input.amount;
		}

		const expense = await createExpense({
			...input,
			currency: expenseCurrency,
			conversionRate,
			rateType,
			baseCurrencyAmount,
			createdBy: user.id,
		});

		return expense;
	});

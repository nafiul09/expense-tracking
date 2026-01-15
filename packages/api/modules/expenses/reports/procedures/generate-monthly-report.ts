import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpenseReport,
	getBusinessesByOrganizationId,
	getCategoryBreakdown,
	getCurrencyRatesByOrganization,
	getExpensesByBusinessId,
	getExpensesTotalByBusinessId,
	getOrganizationById,
} from "@repo/database";
import { convertCurrency } from "@repo/utils";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const generateMonthlyReportProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/reports/generate",
		tags: ["Expenses"],
		summary: "Generate monthly report",
		description: "Generate a monthly expense report",
	})
	.input(
		z.object({
			organizationId: z.string(),
			businessId: z.string().optional(),
			reportPeriodStart: z.coerce.date(),
			reportPeriodEnd: z.coerce.date(),
			reportCurrency: z
				.string()
				.default(config.expenses.defaultBaseCurrency)
				.optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const {
			organizationId,
			businessId,
			reportPeriodStart,
			reportPeriodEnd,
			reportCurrency = config.expenses.defaultBaseCurrency,
		} = input;

		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST", "Organization not found");
		}

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		// Only owners and admins can generate reports
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can generate reports",
			);
		}

		// Get currency rates for conversion
		const currencyRates =
			await getCurrencyRatesByOrganization(organizationId);

		let businesses = [];
		if (businessId) {
			const business =
				await getBusinessesByOrganizationId(organizationId);
			businesses = business.filter((b) => b.id === businessId);
		} else {
			businesses = await getBusinessesByOrganizationId(organizationId);
		}

		const reportData: any = {
			businesses: [],
			totalExpenses: 0,
		};

		for (const business of businesses) {
			const expenses = await getExpensesByBusinessId(business.id, {
				startDate: reportPeriodStart,
				endDate: reportPeriodEnd,
			});

			const totalExpenses = await getExpensesTotalByBusinessId(
				business.id,
				reportPeriodStart,
				reportPeriodEnd,
			);

			const categoryBreakdown = await getCategoryBreakdown(
				business.id,
				reportPeriodStart,
				reportPeriodEnd,
			);

			// Convert expenses to report currency
			// Use stored baseCurrencyAmount if available, otherwise calculate from stored rate
			let convertedTotal = Number(totalExpenses);
			if (business.currency !== reportCurrency) {
				// Check if expenses have stored conversion rates
				// If they do, use baseCurrencyAmount and convert from USD to report currency
				// Otherwise, use current rates
				const expensesWithRates = expenses.filter(
					(e) => e.baseCurrencyAmount !== null,
				);
				if (expensesWithRates.length > 0) {
					// Use stored base currency amounts
					const totalBaseAmount = expensesWithRates.reduce(
						(sum, e) => sum + Number(e.baseCurrencyAmount || 0),
						0,
					);
					// Convert from base currency to report currency
					if (reportCurrency !== baseCurrency) {
						try {
							convertedTotal = convertCurrency(
								totalBaseAmount,
								baseCurrency,
								reportCurrency,
								currencyRates,
							);
						} catch (error) {
							console.error(
								`Failed to convert ${baseCurrency} to ${reportCurrency}:`,
								error,
							);
							convertedTotal = totalBaseAmount;
						}
					} else {
						convertedTotal = totalBaseAmount;
					}
					// Add expenses without stored rates using current conversion
					const expensesWithoutRates = expenses.filter(
						(e) => e.baseCurrencyAmount === null,
					);
					if (expensesWithoutRates.length > 0) {
						const totalWithoutRates = expensesWithoutRates.reduce(
							(sum, e) => sum + Number(e.amount),
							0,
						);
						try {
							const convertedWithoutRates = convertCurrency(
								totalWithoutRates,
								business.currency,
								reportCurrency,
								currencyRates,
							);
							convertedTotal += convertedWithoutRates;
						} catch (error) {
							console.error(
								"Failed to convert expenses without stored rates:",
								error,
							);
						}
					}
				} else {
					// No stored rates, use current rates
					try {
						convertedTotal = convertCurrency(
							Number(totalExpenses),
							business.currency,
							reportCurrency,
							currencyRates,
						);
					} catch (error) {
						console.error(
							`Failed to convert ${business.currency} to ${reportCurrency}:`,
							error,
						);
					}
				}
			}

			// Convert category breakdown amounts
			// For category breakdown, we'll use the same logic - prefer stored rates
			const convertedCategoryBreakdown = categoryBreakdown.map(
				(cat: any) => {
					let convertedAmount = Number(cat.totalAmount);
					if (business.currency !== reportCurrency) {
						// For category breakdown, we'll use current rates
						// In a more sophisticated implementation, we could track category-level conversions
						try {
							convertedAmount = convertCurrency(
								Number(cat.totalAmount),
								business.currency,
								reportCurrency,
								currencyRates,
							);
						} catch (error) {
							console.error(
								"Failed to convert category amount:",
								error,
							);
						}
					}
					return {
						...cat,
						totalAmount: convertedAmount,
					};
				},
			);

			reportData.businesses.push({
				businessId: business.id,
				businessName: business.name,
				businessCurrency: business.currency,
				totalExpenses: convertedTotal,
				expenseCount: expenses.length,
				categoryBreakdown: convertedCategoryBreakdown,
			});

			reportData.totalExpenses += convertedTotal;
		}

		const categoryBreakdown = await getCategoryBreakdown(
			businesses[0]?.id || "",
			reportPeriodStart,
			reportPeriodEnd,
		);

		const report = await createExpenseReport({
			organizationId,
			businessId: businessId || undefined,
			reportPeriodStart,
			reportPeriodEnd,
			totalExpenses: reportData.totalExpenses,
			reportCurrency,
			categoryBreakdown,
			reportData,
		});

		return report;
	});

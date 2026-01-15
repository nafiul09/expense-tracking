import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpenseReport,
	getAllExpensesByOrganizationId,
	getCurrencyRatesByOrganization,
	getOrganizationById,
} from "@repo/database";
import { convertCurrency } from "@repo/utils";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const generateCustomReportProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/reports/generate-custom",
		tags: ["Expenses"],
		summary: "Generate custom report",
		description:
			"Generate a custom expense report with category-based filtering",
	})
	.input(
		z.object({
			organizationId: z.string(),
			reportName: z.string().optional(),
			reportType: z
				.enum([
					"all_categories",
					"subscription",
					"team_salary",
					"one_time",
					"team_member_loan",
				])
				.default("all_categories"),
			accountIds: z.array(z.string()).optional(),
			reportPeriodStart: z.coerce.date(),
			reportPeriodEnd: z.coerce.date(),
			reportCurrency: z
				.string()
				.default(config.expenses.defaultBaseCurrency)
				.optional(),
			includeDetails: z.boolean().default(true),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const {
			organizationId,
			reportName,
			reportType,
			accountIds,
			reportPeriodStart,
			reportPeriodEnd,
			reportCurrency = config.expenses.defaultBaseCurrency,
			includeDetails,
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

		// Get currency rates for conversion
		const currencyRates =
			await getCurrencyRatesByOrganization(organizationId);

		// Get category IDs for the report type
		let categoryIds: string[] | undefined;
		if (reportType !== "all_categories") {
			// Map report type to category name
			const categoryNameMap: Record<string, string> = {
				subscription: "Subscription",
				team_salary: "Team Salary",
				one_time: "One-time",
				team_member_loan: "Team Member Loan",
			};

			const categoryName = categoryNameMap[reportType];
			if (categoryName) {
				// We'll need to fetch categories and filter by name
				// For now, we'll filter expenses by category name in the query
				categoryIds = undefined; // Will filter by category name in getAllExpensesByOrganizationId
			}
		}

		// Fetch expenses with filters
		const { expenses, total } = await getAllExpensesByOrganizationId(
			organizationId,
			{
				categoryIds,
				accountIds,
				startDate: reportPeriodStart,
				endDate: reportPeriodEnd,
				limit: includeDetails ? 10000 : 0, // Large limit for details
			},
		);

		// Filter by category name if reportType is specified
		let filteredExpenses = expenses;
		if (reportType !== "all_categories") {
			const categoryNameMap: Record<string, string> = {
				subscription: "Subscription",
				team_salary: "Team Salary",
				one_time: "One-time",
				team_member_loan: "Team Member Loan",
			};
			const categoryName = categoryNameMap[reportType];
			if (categoryName) {
				filteredExpenses = expenses.filter(
					(e) => e.category.name === categoryName,
				);
			}
		}

		// Calculate totals and breakdowns
		let totalExpenses = 0;
		const categoryBreakdown: Record<string, number> = {};
		const accountBreakdown: Record<string, number> = {};

		for (const expense of filteredExpenses) {
			const amount = Number(expense.amount);
			const expenseCurrency =
				expense.currency ||
				expense.expenseAccount?.currency ||
				config.expenses.defaultBaseCurrency;

			// Convert to report currency
			const convertedAmount = convertCurrency(
				amount,
				expenseCurrency,
				reportCurrency,
				currencyRates,
			);

			totalExpenses += convertedAmount;

			// Category breakdown
			const categoryName = expense.category.name;
			categoryBreakdown[categoryName] =
				(categoryBreakdown[categoryName] || 0) + convertedAmount;

			// Account breakdown
			const accountName = expense.expenseAccount?.name || "Unknown";
			accountBreakdown[accountName] =
				(accountBreakdown[accountName] || 0) + convertedAmount;
		}

		// Prepare report data
		const reportData = {
			expenses: includeDetails
				? filteredExpenses.map((e) => ({
						id: e.id,
						title: e.title,
						description: e.description,
						amount: Number(e.amount),
						currency: e.currency || e.expenseAccount?.currency,
						date: e.date,
						category: e.category.name,
						account: e.expenseAccount?.name,
						teamMember: e.teamMember?.name,
					}))
				: [],
			categoryBreakdown,
			accountBreakdown,
			totalExpenses,
			reportCurrency,
			reportType,
		};

		// Create report record
		const report = await createExpenseReport({
			organizationId,
			reportName:
				reportName || `Report ${new Date().toLocaleDateString()}`,
			reportType,
			reportPeriodStart,
			reportPeriodEnd,
			selectedAccountIds: accountIds,
			totalExpenses,
			reportCurrency,
			categoryBreakdown: categoryBreakdown as any,
			reportData: reportData as any,
			isScheduled: false,
		});

		return report;
	});

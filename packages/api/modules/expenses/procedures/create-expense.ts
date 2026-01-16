import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import {
	createExpense,
	getCurrencyRatesByOrganization,
	getExpenseAccountById,
	getTeamMemberById,
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
		description:
			"Create a new expense entry with conditional fields based on category type",
	})
	.input(
		z
			.object({
				businessId: z.string(),
				categoryId: z.string().optional(),
				expenseType: z
					.enum(["subscription", "team_salary", "one_time"])
					.default("one_time"),
				title: z.string().min(1).max(255).optional(),
				description: z.string().optional(),
				amount: z.number().positive(),
				currency: z.string().default("USD"),
				rateType: z
					.enum(["default", "custom"])
					.default("default")
					.optional(),
				customRate: z.number().positive().optional(),
				date: z.coerce.date(),
				paymentMethodId: z.string().optional(),
				receiptUrl: z.string().url().optional(),
				status: z.string().default("active"),
				metadata: z.record(z.string(), z.any()).optional(),
				// Subscription linking (for subscription expense type)
				subscriptionId: z.string().optional(),
				// Conditional: Team Salary fields
				teamMemberId: z.string().optional(),
				salaryType: z.enum(["default", "custom"]).optional(),
				salaryMonth: z
					.string()
					.regex(/^\d{4}-\d{2}$/)
					.optional(), // Format: YYYY-MM
			})
			.superRefine((data, ctx) => {
				// Validate expenseType-specific requirements
				if (
					data.expenseType === "subscription" &&
					!data.subscriptionId
				) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							"subscriptionId is required for subscription expenses",
						path: ["subscriptionId"],
					});
				}
				if (data.expenseType === "team_salary") {
					if (!data.teamMemberId) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message:
								"teamMemberId is required for team salary expenses",
							path: ["teamMemberId"],
						});
					}
					if (!data.salaryMonth) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message:
								"salaryMonth is required for team salary expenses",
							path: ["salaryMonth"],
						});
					}
					if (!data.salaryType) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message:
								"salaryType is required for team salary expenses",
							path: ["salaryType"],
						});
					}
				}
				if (data.expenseType === "one_time" && !data.title) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "title is required for one-time expenses",
						path: ["title"],
					});
				}
			}),
	)
	.handler(async ({ context: { user }, input }) => {
		const expenseAccount = await getExpenseAccountById(input.businessId);

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

		// Validate expenseType-specific requirements
		if (input.expenseType === "subscription") {
			if (!input.subscriptionId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"subscriptionId is required for subscription expenses",
				});
			}
			// Verify subscription exists and belongs to the same expense account
			const { getSubscriptionById } = await import("@repo/database");
			const subscription = await getSubscriptionById(
				input.subscriptionId,
			);

			if (!subscription) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Subscription not found",
				});
			}

			if (subscription.expenseAccountId !== input.businessId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Subscription does not belong to this expense account",
				});
			}

			if (subscription.status !== "active") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Cannot add expenses to inactive subscription",
				});
			}
		}

		// Team Salary validation
		let teamMemberName: string | undefined;
		if (input.expenseType === "team_salary") {
			if (!input.teamMemberId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Team member is required for team salary expenses",
				});
			}
			if (!input.salaryType) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Salary type (default or custom) is required",
				});
			}

			// Get team member to auto-fill salary if using default
			const teamMember = await getTeamMemberById(input.teamMemberId);
			if (!teamMember) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Team member not found",
				});
			}

			// Store team member name for title generation
			teamMemberName = teamMember.name;

			// Check if team member is associated with this expense account
			const isAssociated =
				teamMember.businessId === input.businessId ||
				teamMember.accounts?.some(
					(acc) => acc.accountId === input.businessId,
				);

			if (!isAssociated) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Team member is not associated with this expense account",
				});
			}

			// Validate salary month is provided
			if (!input.salaryMonth) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Salary month is required for team salary expenses",
				});
			}

			// Check for duplicate salary for same team member + expense account + month
			const { getExpensesByBusinessId } = await import("@repo/database");
			const existingExpenses = await getExpensesByBusinessId(
				input.businessId,
				{
					teamMemberId: input.teamMemberId,
				},
			);

			const duplicateSalary = existingExpenses.find(
				(exp) =>
					exp.teamMemberId === input.teamMemberId &&
					exp.salaryMonth === input.salaryMonth &&
					exp.categoryId === input.categoryId &&
					exp.status !== "cancelled",
			);

			if (duplicateSalary) {
				const monthName = new Date(
					input.salaryMonth + "-01",
				).toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});
				throw new ORPCError("BAD_REQUEST", {
					message: `Salary for ${teamMember.name} has already been recorded for ${monthName} in this expense account`,
				});
			}

			// Auto-fill amount if using default salary
			if (input.salaryType === "default") {
				// Get salary from account association or legacy field
				const accountSalary = teamMember.accounts?.find(
					(acc) => acc.accountId === input.businessId,
				)?.salary;

				const defaultSalary = accountSalary || teamMember.salary || 0;

				if (Number(defaultSalary) === 0) {
					throw new ORPCError("BAD_REQUEST", {
						message:
							"Team member does not have a salary configured. Please use custom salary type.",
					});
				}

				// Override amount with team member's salary
				input.amount = Number(defaultSalary);
			}
		}

		// One-Time expense validation
		if (input.expenseType === "one_time") {
			if (!input.title) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Title is required for one-time expenses",
				});
			}
			// Don't allow team member or subscription fields for one-time
			if (input.teamMemberId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Team member cannot be assigned to one-time expenses",
				});
			}
			if (input.subscriptionId) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Subscription cannot be assigned to one-time expenses",
				});
			}
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
					throw new ORPCError("BAD_REQUEST", {
						message: `Conversion rate not found for ${expenseCurrency}. Please set up the currency rate in workspace settings or use a custom rate.`,
					});
				}

				conversionRate = Number(rate.rate);
			}

			// Calculate base currency amount
			baseCurrencyAmount = input.amount / conversionRate;
		} else {
			// Same currency, no conversion needed
			baseCurrencyAmount = input.amount;
		}

		// Prepare expense data
		const expenseData: any = {
			businessId: input.businessId,
			categoryId: input.categoryId,
			expenseType: input.expenseType,
			title:
				input.title ||
				(input.expenseType === "team_salary" && teamMemberName
					? `${teamMemberName} - Salary Payment`
					: input.expenseType === "subscription"
						? "Subscription Payment"
						: "Expense"),
			description: input.description,
			amount: input.amount,
			currency: expenseCurrency,
			conversionRate,
			rateType,
			baseCurrencyAmount,
			date: input.date,
			receiptUrl: input.receiptUrl,
			status: input.status,
			metadata: input.metadata,
			createdBy: user.id,
		};

		// Add conditional fields based on expenseType
		if (
			input.expenseType === "team_salary" &&
			input.teamMemberId &&
			input.salaryType
		) {
			expenseData.teamMemberId = input.teamMemberId;
			expenseData.salaryMonth = input.salaryMonth;
			// For team salary, set date to first day of the selected month
			if (input.salaryMonth) {
				expenseData.date = new Date(input.salaryMonth + "-01");
			}
		}

		if (input.expenseType === "subscription" && input.subscriptionId) {
			expenseData.subscriptionId = input.subscriptionId;
		}

		if (input.paymentMethodId) {
			expenseData.paymentMethodId = input.paymentMethodId;
		}

		const expense = await createExpense(expenseData);

		// Fetch expense with all relations
		const { getExpenseById } = await import("@repo/database");
		const fullExpense = await getExpenseById(expense.id);

		return fullExpense;
	});

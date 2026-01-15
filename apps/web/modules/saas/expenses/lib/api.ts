import { orpcClient } from "@shared/lib/orpc-client";

export const expensesApi = {
		// Expense Accounts
		expenseAccounts: {
			list: async (organizationId: string) => {
				return orpcClient.expenses.expenseAccounts.list({ organizationId });
			},
			getDetails: async (id: string) => {
				return orpcClient.expenses.expenseAccounts.getDetails({ id });
			},
			create: async (data: {
				organizationId: string;
				name: string;
				description?: string;
				currency?: string;
				type?: "personal" | "business";
			}) => {
				return orpcClient.expenses.expenseAccounts.create(data);
			},
			update: async (data: {
				id: string;
				name?: string;
				description?: string;
				currency?: string;
				type?: "personal" | "business";
			}) => {
				return orpcClient.expenses.expenseAccounts.update(data);
			},
			delete: async (id: string) => {
				return orpcClient.expenses.expenseAccounts.delete({ id });
			},
		},
		// Legacy alias for backward compatibility
		businesses: {
			list: async (organizationId: string) => {
				return orpcClient.expenses.expenseAccounts.list({ organizationId });
			},
			getDetails: async (id: string) => {
				return orpcClient.expenses.expenseAccounts.getDetails({ id });
			},
			create: async (data: {
				organizationId: string;
				name: string;
				description?: string;
				currency?: string;
				type?: "personal" | "business";
			}) => {
				return orpcClient.expenses.expenseAccounts.create(data);
			},
			update: async (data: {
				id: string;
				name?: string;
				description?: string;
				currency?: string;
				type?: "personal" | "business";
			}) => {
				return orpcClient.expenses.expenseAccounts.update(data);
			},
			delete: async (id: string) => {
				return orpcClient.expenses.expenseAccounts.delete({ id });
			},
		},

	// Currencies
	currencies: {
		list: async (organizationId: string) => {
			return orpcClient.expenses.currencies.list({ organizationId });
		},
		upsert: async (data: {
			organizationId: string;
			toCurrency: string;
			rate: number;
			symbol?: string;
			symbolPosition?: "left" | "right";
			separator?: string;
			decimalSeparator?: string;
		}) => {
			return orpcClient.expenses.currencies.upsert(data);
		},
		delete: async (id: string) => {
			return orpcClient.expenses.currencies.delete({ id });
		},
	},
	// Legacy alias for backward compatibility
	currencyRates: {
		list: async (organizationId: string) => {
			return orpcClient.expenses.currencies.list({ organizationId });
		},
		upsert: async (data: {
			organizationId: string;
			toCurrency: string;
			rate: number;
		}) => {
			return orpcClient.expenses.currencies.upsert(data);
		},
		delete: async (id: string) => {
			return orpcClient.expenses.currencies.delete({ id });
		},
	},

	// Expenses
	expenses: {
		list: async (data: {
			businessId: string;
			categoryId?: string;
			teamMemberId?: string;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
			offset?: number;
		}) => {
			return orpcClient.expenses.list(data);
		},
		listAll: async (data: {
			organizationId: string;
			categoryIds?: string[];
			accountIds?: string[];
			teamMemberId?: string;
			startDate?: Date;
			endDate?: Date;
			status?: string;
			search?: string;
			limit?: number;
			offset?: number;
		}) => {
			return orpcClient.expenses.listAll(data);
		},
		getDetails: async (id: string) => {
			return orpcClient.expenses.getDetails({ id });
		},
		create: async (data: {
			businessId: string;
			categoryId: string;
			teamMemberId?: string;
			paymentMethodId?: string;
			title: string;
			description?: string;
			amount: number;
			currency?: string;
			rateType?: "default" | "custom";
			customRate?: number;
			date: Date;
			receiptUrl?: string;
			status?: string;
			metadata?: Record<string, any>;
		}) => {
			return orpcClient.expenses.create(data);
		},
		update: async (data: {
			id: string;
			categoryId?: string;
			teamMemberId?: string | null;
			paymentMethodId?: string | null;
			title?: string;
			description?: string | null;
			amount?: number;
			currency?: string;
			date?: Date;
			receiptUrl?: string | null;
			status?: string;
			metadata?: Record<string, any>;
		}) => {
			return orpcClient.expenses.update(data);
		},
		delete: async (id: string) => {
			return orpcClient.expenses.delete({ id });
		},
	},

	// Categories
	categories: {
		list: async (organizationId: string) => {
			return orpcClient.expenses.listCategories({ organizationId });
		},
		create: async (data: {
			organizationId: string;
			name: string;
			type?: "default" | "custom";
		}) => {
			return orpcClient.expenses.createCategory(data);
		},
	},

	// Payment Methods
	paymentMethods: {
		list: async (organizationId: string) => {
			return orpcClient.expenses.listPaymentMethods({ organizationId });
		},
		create: async (data: {
			organizationId: string;
			name: string;
			type:
				| "credit_card"
				| "debit_card"
				| "bank_account"
				| "cash"
				| "other";
			lastFourDigits?: string;
			isDefault?: boolean;
		}) => {
			return orpcClient.expenses.createPaymentMethod(data);
		},
	},

	// Team Members
	teamMembers: {
		list: async (businessId: string) => {
			return orpcClient.expenses.teamMembers.list({ businessId });
		},
		listAll: async (data: {
			organizationId: string;
			accountIds?: string[];
			status?: string;
			search?: string;
		}) => {
			return orpcClient.expenses.teamMembers.listAll(data);
		},
		getDetails: async (id: string) => {
			return orpcClient.expenses.teamMembers.getDetails({ id });
		},
		create: async (data: {
			businessId?: string;
			name: string;
			email?: string;
			position?: string;
			joinedDate?: Date;
			salary?: number;
			status?: "active" | "inactive";
			notes?: string;
			accountAssociations?: Array<{
				accountId: string;
				position?: string;
				joinedDate?: Date;
				salary?: number;
			}>;
		}) => {
			return orpcClient.expenses.teamMembers.create(data);
		},
		update: async (data: {
			id: string;
			name?: string;
			email?: string | null;
			position?: string | null;
			joinedDate?: Date | null;
			salary?: number | null;
			status?: "active" | "inactive";
			notes?: string | null;
		}) => {
			return orpcClient.expenses.teamMembers.update(data);
		},
		delete: async (id: string) => {
			return orpcClient.expenses.teamMembers.delete({ id });
		},
	},

	// Subscriptions
	subscriptions: {
		list: async (data: {
			businessId: string;
			status?: "active" | "cancelled" | "paused";
		}) => {
			return orpcClient.expenses.subscriptions.list(data);
		},
		listAll: async (data: {
			organizationId: string;
			accountIds?: string[];
			status?: "active" | "cancelled" | "paused";
			renewalFrequency?: string;
			nextRenewalStart?: Date;
			nextRenewalEnd?: Date;
		}) => {
			return orpcClient.expenses.subscriptions.listAll(data);
		},
		getUpcomingRenewals: async (data: {
			businessId: string;
			days?: number;
		}) => {
			return orpcClient.expenses.subscriptions.getUpcomingRenewals(data);
		},
		create: async (data: {
			expenseId: string;
			renewalDate: Date;
			renewalFrequency?: "monthly" | "yearly" | "weekly" | "custom";
			autoRenew?: boolean;
			reminderDays?: number;
			provider?: string;
			status?: "active" | "cancelled" | "paused";
		}) => {
			return orpcClient.expenses.subscriptions.create(data);
		},
		cancel: async (id: string) => {
			return orpcClient.expenses.subscriptions.cancel({ id });
		},
		updateReminderSettings: async (data: {
			id: string;
			reminderDays?: number;
			autoRenew?: boolean;
		}) => {
			return orpcClient.expenses.subscriptions.updateReminderSettings(
				data,
			);
		},
	},

	// Loans
	loans: {
		list: async (data: {
			businessId: string;
			status?: "active" | "paid" | "partial";
			teamMemberId?: string;
		}) => {
			return orpcClient.expenses.loans.list(data);
		},
		listAll: async (data: {
			organizationId: string;
			accountIds?: string[];
			teamMemberIds?: string[];
			status?: "active" | "paid" | "partial";
			loanDateStart?: Date;
			loanDateEnd?: Date;
		}) => {
			return orpcClient.expenses.loans.listAll(data);
		},
		getHistory: async (id: string) => {
			return orpcClient.expenses.loans.getHistory({ id });
		},
		create: async (data: {
			expenseId: string;
			teamMemberId: string;
			principalAmount: number;
			loanDate: Date;
			notes?: string;
		}) => {
			return orpcClient.expenses.loans.create(data);
		},
		addPayment: async (data: {
			id: string;
			amount: number;
			paymentDate: Date;
			paymentMethod?: string;
			notes?: string;
		}) => {
			return orpcClient.expenses.loans.addPayment(data);
		},
	},

	// Analytics
	analytics: {
		getOverview: async (data: {
			businessId: string;
			startDate?: Date;
			endDate?: Date;
		}) => {
			return orpcClient.expenses.analytics.getOverview(data);
		},
		getCategoryBreakdown: async (data: {
			businessId: string;
			startDate?: Date;
			endDate?: Date;
		}) => {
			return orpcClient.expenses.analytics.getCategoryBreakdown(data);
		},
		getTrendAnalysis: async (data: {
			businessId: string;
			startDate: Date;
			endDate: Date;
			groupBy?: "day" | "week" | "month";
		}) => {
			return orpcClient.expenses.analytics.getTrendAnalysis(data);
		},
		compareBusinesses: async (data: {
			organizationId: string;
			startDate?: Date;
			endDate?: Date;
		}) => {
			return orpcClient.expenses.analytics.compareBusinesses(data);
		},
		getTeamMemberExpenseSummary: async (data: {
			businessId: string;
			startDate?: Date;
			endDate?: Date;
		}) => {
			return orpcClient.expenses.analytics.getTeamMemberExpenseSummary(
				data,
			);
		},
	},

	// Reports
	reports: {
		list: async (data: { organizationId: string; businessId?: string }) => {
			return orpcClient.expenses.reports.list(data);
		},
		getDetails: async (id: string) => {
			return orpcClient.expenses.reports.getDetails({ id });
		},
		generate: async (data: {
			organizationId: string;
			businessId?: string;
			reportPeriodStart: Date;
			reportPeriodEnd: Date;
			reportCurrency?: string;
		}) => {
			return orpcClient.expenses.reports.generate(data);
		},
		generateCustom: async (data: {
			organizationId: string;
			reportName?: string;
			reportType?: "all_categories" | "subscription" | "team_salary" | "one_time" | "team_member_loan";
			accountIds?: string[];
			reportPeriodStart: Date;
			reportPeriodEnd: Date;
			reportCurrency?: string;
			includeDetails?: boolean;
		}) => {
			return orpcClient.expenses.reports.generateCustom(data);
		},
	},
};

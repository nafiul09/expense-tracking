import { config } from "@repo/config";
import { convertCurrency } from "@repo/utils";
import type { CurrencyRate } from "@repo/database";

export interface AccountBreakdown {
	accountId: string;
	accountName: string;
	currency: string;
	amount: number;
}

export interface SummaryStats {
	// For specific account selection
	last30Days: number;
	currentMonth: number;
	totalCount: number;

	// For "All Accounts" breakdown
	last30DaysBreakdown?: AccountBreakdown[];
	currentMonthBreakdown?: AccountBreakdown[];
}

interface Expense {
	id: string;
	businessId: string;
	amount: number | string;
	currency?: string | null;
	date: string | Date;
	baseCurrencyAmount?: number | string | null;
	conversionRate?: number | string | null;
	expenseAccount?: {
		id: string;
		name: string;
		currency: string;
	} | null;
}

interface ExpenseAccount {
	id: string;
	name: string;
	currency: string;
}

function calculateBreakdownSummary(
	expenses: Expense[],
	accounts: ExpenseAccount[],
	currencyRates: CurrencyRate[],
): SummaryStats {
	const now = new Date();
	const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	// Group expenses by account
	const accountMap = new Map<string, ExpenseAccount>();
	for (const account of accounts) {
		accountMap.set(account.id, account);
	}

	// Calculate per-account totals in native currencies
	const last30DaysByAccount = new Map<string, number>();
	const currentMonthByAccount = new Map<string, number>();

	for (const expense of expenses) {
		const expenseDate = new Date(expense.date);
		const accountId = expense.businessId;
		const account = accountMap.get(accountId);
		if (!account) continue;

		// Get amount in account's native currency
		// Use baseCurrencyAmount if available, otherwise convert from expense currency
		let amountInAccountCurrency: number;

		if (expense.baseCurrencyAmount != null) {
			// Convert from USD to account currency
			const baseAmount = Number(expense.baseCurrencyAmount);
			if (account.currency === config.expenses.defaultBaseCurrency) {
				amountInAccountCurrency = baseAmount;
			} else {
				try {
					amountInAccountCurrency = convertCurrency(
						baseAmount,
						config.expenses.defaultBaseCurrency,
						account.currency,
						currencyRates,
					);
				} catch {
					// Fallback to original amount if conversion fails
					amountInAccountCurrency = Number(expense.amount);
				}
			}
		} else {
			// Use expense amount directly (should already be in account currency)
			amountInAccountCurrency = Number(expense.amount);
		}

		// Add to last 30 days if applicable
		if (expenseDate >= last30DaysStart && expenseDate <= now) {
			const current = last30DaysByAccount.get(accountId) || 0;
			last30DaysByAccount.set(accountId, current + amountInAccountCurrency);
		}

		// Add to current month if applicable
		if (expenseDate >= currentMonthStart && expenseDate <= now) {
			const current = currentMonthByAccount.get(accountId) || 0;
			currentMonthByAccount.set(accountId, current + amountInAccountCurrency);
		}
	}

	// Build breakdown arrays
	const last30DaysBreakdown: AccountBreakdown[] = [];
	const currentMonthBreakdown: AccountBreakdown[] = [];

	for (const [accountId, amount] of last30DaysByAccount.entries()) {
		const account = accountMap.get(accountId);
		if (!account) continue;

		last30DaysBreakdown.push({
			accountId,
			accountName: account.name,
			currency: account.currency,
			amount,
		});
	}

	for (const [accountId, amount] of currentMonthByAccount.entries()) {
		const account = accountMap.get(accountId);
		if (!account) continue;

		currentMonthBreakdown.push({
			accountId,
			accountName: account.name,
			currency: account.currency,
			amount,
		});
	}

	return {
		last30Days: 0,
		currentMonth: 0,
		totalCount: expenses.length,
		last30DaysBreakdown,
		currentMonthBreakdown,
	};
}

function calculateConvertedSummary(
	expenses: Expense[],
	accounts: ExpenseAccount[],
	selectedAccountIds: string[],
	currencyRates: CurrencyRate[],
): SummaryStats {
	const now = new Date();
	const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	// Get the account currency (use first selected account's currency)
	const selectedAccount = accounts.find((a) =>
		selectedAccountIds.includes(a.id),
	);
	const accountCurrency =
		selectedAccount?.currency || config.expenses.defaultBaseCurrency;

	let last30DaysTotal = 0;
	let currentMonthTotal = 0;

	for (const expense of expenses) {
		const expenseDate = new Date(expense.date);
		const expenseAccountCurrency =
			expense.expenseAccount?.currency || expense.currency || "USD";

		// Get amount in account currency
		let amountInAccountCurrency: number;

		if (expenseAccountCurrency === accountCurrency) {
			// Same currency, use amount directly
			amountInAccountCurrency = Number(expense.amount);
		} else {
			// Need to convert
			if (expense.baseCurrencyAmount != null) {
				// Use baseCurrencyAmount for accurate conversion
				const baseAmount = Number(expense.baseCurrencyAmount);
				try {
					if (accountCurrency === config.expenses.defaultBaseCurrency) {
						amountInAccountCurrency = baseAmount;
					} else {
						amountInAccountCurrency = convertCurrency(
							baseAmount,
							config.expenses.defaultBaseCurrency,
							accountCurrency,
							currencyRates,
						);
					}
				} catch {
					amountInAccountCurrency = Number(expense.amount);
				}
			} else {
				// Convert from expense currency
				try {
					amountInAccountCurrency = convertCurrency(
						Number(expense.amount),
						expenseAccountCurrency,
						accountCurrency,
						currencyRates,
					);
				} catch {
					amountInAccountCurrency = Number(expense.amount);
				}
			}
		}

		// Add to last 30 days if applicable
		if (expenseDate >= last30DaysStart && expenseDate <= now) {
			last30DaysTotal += amountInAccountCurrency;
		}

		// Add to current month if applicable
		if (expenseDate >= currentMonthStart && expenseDate <= now) {
			currentMonthTotal += amountInAccountCurrency;
		}
	}

	return {
		last30Days: last30DaysTotal,
		currentMonth: currentMonthTotal,
		totalCount: expenses.length,
	};
}

export function calculateSummaryStats(
	expenses: Expense[],
	accounts: ExpenseAccount[],
	selectedAccountIds: string[],
	currencyRates: CurrencyRate[],
): SummaryStats {
	const isAllAccounts = selectedAccountIds.length === 0;

	if (isAllAccounts) {
		// Calculate per-account breakdown in native currencies
		return calculateBreakdownSummary(expenses, accounts, currencyRates);
	} else {
		// Calculate totals for selected accounts in their currency
		return calculateConvertedSummary(
			expenses,
			accounts,
			selectedAccountIds,
			currencyRates,
		);
	}
}

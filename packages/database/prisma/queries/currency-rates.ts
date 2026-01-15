import { db } from "../client";
import type { CurrencyRate } from "../generated/client";

export async function getCurrencyRatesByOrganization(
	organizationId: string,
): Promise<CurrencyRate[]> {
	return db.currencyRate.findMany({
		where: {
			organizationId,
		},
		orderBy: {
			toCurrency: "asc",
		},
	});
}

export async function getCurrencyRate(
	organizationId: string,
	toCurrency: string,
): Promise<CurrencyRate | null> {
	return db.currencyRate.findUnique({
		where: {
			organizationId_toCurrency: {
				organizationId,
				toCurrency,
			},
		},
	});
}

export async function getCurrencyRateById(
	id: string,
): Promise<CurrencyRate | null> {
	return db.currencyRate.findUnique({
		where: {
			id,
		},
	});
}

export async function createCurrencyRate(data: {
	organizationId: string;
	toCurrency: string;
	rate: number;
	symbol?: string;
	symbolPosition?: string;
	separator?: string;
	decimalSeparator?: string;
	updatedBy?: string;
}): Promise<CurrencyRate> {
	return db.currencyRate.create({
		data: {
			organizationId: data.organizationId,
			fromCurrency: "USD", // Always USD as base currency
			toCurrency: data.toCurrency,
			rate: data.rate,
			symbol: data.symbol,
			symbolPosition: data.symbolPosition || "left",
			separator: data.separator || ",",
			decimalSeparator: data.decimalSeparator || ".",
			updatedBy: data.updatedBy,
		},
	});
}

export async function updateCurrencyRate(data: {
	id: string;
	rate?: number;
	symbol?: string;
	symbolPosition?: string;
	separator?: string;
	decimalSeparator?: string;
	updatedBy?: string;
}): Promise<CurrencyRate> {
	return db.currencyRate.update({
		where: {
			id: data.id,
		},
		data: {
			rate: data.rate,
			symbol: data.symbol,
			symbolPosition: data.symbolPosition,
			separator: data.separator,
			decimalSeparator: data.decimalSeparator,
			updatedBy: data.updatedBy,
			updatedAt: new Date(),
		},
	});
}

export async function upsertCurrencyRate(data: {
	organizationId: string;
	toCurrency: string;
	rate: number;
	symbol?: string;
	symbolPosition?: string;
	separator?: string;
	decimalSeparator?: string;
	updatedBy?: string;
}): Promise<CurrencyRate> {
	return db.currencyRate.upsert({
		where: {
			organizationId_toCurrency: {
				organizationId: data.organizationId,
				toCurrency: data.toCurrency,
			},
		},
		create: {
			organizationId: data.organizationId,
			fromCurrency: "USD",
			toCurrency: data.toCurrency,
			rate: data.rate,
			symbol: data.symbol,
			symbolPosition: data.symbolPosition || "left",
			separator: data.separator || ",",
			decimalSeparator: data.decimalSeparator || ".",
			updatedBy: data.updatedBy,
		},
		update: {
			rate: data.rate,
			symbol: data.symbol,
			symbolPosition: data.symbolPosition,
			separator: data.separator,
			decimalSeparator: data.decimalSeparator,
			updatedBy: data.updatedBy,
			updatedAt: new Date(),
		},
	});
}

export async function deleteCurrencyRate(id: string): Promise<CurrencyRate> {
	return db.currencyRate.delete({
		where: {
			id,
		},
	});
}

/**
 * Check if a currency is used by any expense accounts in an organization
 */
export async function countExpenseAccountsByCurrency(
	organizationId: string,
	currency: string,
): Promise<number> {
	return db.expenseAccount.count({
		where: {
			organizationId,
			currency,
		},
	});
}

/**
 * Check if a currency is used by any expenses in an organization
 */
export async function countExpensesByCurrency(
	organizationId: string,
	currency: string,
): Promise<number> {
	return db.expense.count({
		where: {
			expenseAccount: {
				organizationId,
			},
			currency,
		},
	});
}

import { config } from "@repo/config";
import type { CurrencyRate } from "@repo/database";

/**
 * Convert an amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rates - Array of currency rates (from USD to other currencies)
 * @returns Converted amount
 */
export function convertCurrency(
	amount: number,
	fromCurrency: string,
	toCurrency: string,
	rates: CurrencyRate[],
): number {
	// If same currency, no conversion needed
	if (fromCurrency === toCurrency) {
		return amount;
	}

	// Base currency is USD
	const baseCurrency = config.expenses.defaultBaseCurrency;

	// If converting from base currency
	if (fromCurrency === baseCurrency) {
		const rate = rates.find((r) => r.toCurrency === toCurrency);
		if (!rate) {
			throw new Error(
				`Conversion rate not found for ${baseCurrency} to ${toCurrency}`,
			);
		}
		return amount * Number(rate.rate);
	}

	// If converting to base currency
	if (toCurrency === baseCurrency) {
		const rate = rates.find((r) => r.toCurrency === fromCurrency);
		if (!rate) {
			throw new Error(
				`Conversion rate not found for ${baseCurrency} to ${fromCurrency}`,
			);
		}
		return amount / Number(rate.rate);
	}

	// Converting between two non-base currencies
	// First convert to base, then to target
	const fromRate = rates.find((r) => r.toCurrency === fromCurrency);
	const toRate = rates.find((r) => r.toCurrency === toCurrency);

	if (!fromRate || !toRate) {
		throw new Error(
			`Conversion rates not found for ${fromCurrency} or ${toCurrency}`,
		);
	}

	// Convert to base currency first
	const baseAmount = amount / Number(fromRate.rate);
	// Then convert to target currency
	return baseAmount * Number(toRate.rate);
}

/**
 * Get conversion rate from USD to target currency
 * @param toCurrency - Target currency code
 * @param rates - Array of currency rates
 * @returns Conversion rate (1 USD = rate * toCurrency)
 */
export function getConversionRate(
	toCurrency: string,
	rates: CurrencyRate[],
): number {
	if (toCurrency === config.expenses.defaultBaseCurrency) {
		return 1;
	}

	const rate = rates.find((r) => r.toCurrency === toCurrency);
	if (!rate) {
		throw new Error(
			`Conversion rate not found for ${config.expenses.defaultBaseCurrency} to ${toCurrency}`,
		);
	}
	return Number(rate.rate);
}

/**
 * Format currency amount with currency symbol and custom formatting
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param currencyRate - Optional CurrencyRate object with formatting options
 * @returns Formatted string (e.g., "$1,234.56" or "€1,234.56")
 */
export function formatCurrency(
	amount: number,
	currency: string,
	currencyRate?: CurrencyRate | null,
): string {
	// If we have custom formatting options, use them
	if (
		currencyRate?.symbol ||
		currencyRate?.separator ||
		currencyRate?.decimalSeparator
	) {
		const symbol = currencyRate.symbol || "";
		const symbolPosition = currencyRate.symbolPosition || "left";
		const separator = currencyRate.separator || ",";
		const decimalSeparator = currencyRate.decimalSeparator || ".";

		// Format the number with custom separators
		const parts = amount.toFixed(2).split(".");
		const integerPart =
			parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, separator) || "0";
		const decimalPart = parts[1] || "00";

		const formattedAmount = `${integerPart}${decimalSeparator}${decimalPart}`;

		// Add symbol based on position
		if (symbolPosition === "left") {
			return `${symbol}${formattedAmount}`;
		}
		return `${formattedAmount}${symbol}`;
	}

	// Fallback to Intl.NumberFormat for standard formatting
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);
}

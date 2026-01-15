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

/**
 * Format expense/loan amount showing converted amount in account currency with original amount in brackets
 * @param originalAmount - Original amount entered by user
 * @param originalCurrency - Original currency code
 * @param accountCurrency - Expense account's default currency
 * @param rates - Array of currency rates
 * @param baseCurrencyAmount - Optional: Amount in USD (if already calculated)
 * @param conversionRate - Optional: Rate from original currency to USD
 * @returns Formatted string (e.g., "1,200 BDT ($10)" or "$10" if same currency)
 */
export function formatAmountWithOriginal(
	originalAmount: number,
	originalCurrency: string,
	accountCurrency: string,
	rates: CurrencyRate[],
	baseCurrencyAmount?: number | null,
	conversionRate?: number | null,
): string {
	// If same currency, no conversion needed
	if (originalCurrency === accountCurrency) {
		const accountRate = rates.find((r) => r.toCurrency === accountCurrency);
		return formatCurrency(originalAmount, accountCurrency, accountRate);
	}

	// Calculate converted amount: Original Currency → USD → Account Currency
	let amountInUSD: number;

	// Use baseCurrencyAmount if available (already calculated)
	if (baseCurrencyAmount != null) {
		amountInUSD = Number(baseCurrencyAmount);
	} else if (conversionRate != null) {
		// Use conversionRate if available
		// conversionRate is FROM original currency TO USD, so divide
		amountInUSD = originalAmount / Number(conversionRate);
	} else {
		// Calculate from rates
		if (originalCurrency === config.expenses.defaultBaseCurrency) {
			amountInUSD = originalAmount;
		} else {
			const rate = rates.find((r) => r.toCurrency === originalCurrency);
			if (!rate) {
				// Fallback: just show original amount
				return formatCurrency(originalAmount, originalCurrency);
			}
			// rate.rate means "1 USD = rate.rate * toCurrency", so divide to convert TO USD
			amountInUSD = originalAmount / Number(rate.rate);
		}
	}

	// Convert USD to account currency
	let convertedAmount: number;
	if (accountCurrency === config.expenses.defaultBaseCurrency) {
		convertedAmount = amountInUSD;
	} else {
		const accountRate = rates.find((r) => r.toCurrency === accountCurrency);
		if (!accountRate) {
			// Fallback: just show original amount
			return formatCurrency(originalAmount, originalCurrency);
		}
		convertedAmount = amountInUSD * Number(accountRate.rate);
	}

	// Format: ConvertedAmount AccountCurrency (OriginalAmount OriginalCurrency)
	const accountRate = rates.find((r) => r.toCurrency === accountCurrency);
	const originalRate = rates.find((r) => r.toCurrency === originalCurrency);

	const formattedConverted = formatCurrency(
		convertedAmount,
		accountCurrency,
		accountRate,
	);
	const formattedOriginal = formatCurrency(
		originalAmount,
		originalCurrency,
		originalRate,
	);

	return `${formattedConverted} (${formattedOriginal})`;
}

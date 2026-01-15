# Currency Conversion System

## Overview

The expense tracking system implements a sophisticated three-tier currency conversion architecture that allows for flexible multi-currency expense management while maintaining accurate conversion tracking and reporting.

## Architecture

### Three-Tier Currency Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Workspace Level (Tier 1)                 │
│                  Base Currency: USD (Fixed)                 │
│          All workspace-wide calculations use USD            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Expense Account Level (Tier 2)                │
│           Default Currency: Configurable per account        │
│         Examples: BDT, EUR, GBP, CAD, etc.                 │
│       Each expense account can have its own currency        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Transaction Level (Tier 3)                   │
│         Input Currency: User-selected at entry time         │
│    Can be any currency configured in workspace settings     │
└─────────────────────────────────────────────────────────────┘
```

## Currency Conversion Flow

### Conversion Chain

All currency conversions follow a consistent pattern:

```
Input Currency → USD (Workspace Base) → Expense Account Currency
```

### Example Scenario

**Setup:**
- Workspace base currency: USD (fixed)
- Expense account default currency: BDT
- Configured conversion rates:
  - EUR to USD: 1.1
  - USD to BDT: 120

**Transaction:**
User enters an expense of **10 EUR**

**Conversion Process:**
1. **Step 1: Input Currency to USD**
   - 10 EUR × 1.1 = **11 USD**

2. **Step 2: USD to Expense Account Currency**
   - 11 USD × 120 = **1,320 BDT**

3. **Final Record:**
   - Amount stored: **1,320 BDT** (expense account currency)
   - Original amount preserved: **10 EUR**
   - Conversion metadata saved for audit trail

## User Interface

### Currency Selection

When creating an expense, the currency dropdown displays:

```
BDT (Default)  ← Expense account's default currency
USD
EUR
GBP
```

**Key Features:**
- Default currency is clearly marked with "(Default)" indicator
- Only currencies configured in workspace settings are shown
- Auto-selects the expense account's default currency on form load

### Conversion Display

#### When Default Currency is Selected

If user selects the expense account's default currency (e.g., BDT):
- **No conversion UI is shown**
- Clean, simple interface
- Direct amount entry

#### When Different Currency is Selected

If user selects a different currency (e.g., EUR):

```
┌─────────────────────────────────────────────────────────────┐
│ Currency: EUR                                               │
│ Amount: 10                                                  │
│ Date: 2024-01-15                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Conversion Rate                                     │   │
│ │                                                     │   │
│ │ ○ Use Default Rate (1 EUR = 1.1000 USD)           │   │
│ │ ○ Use Custom Rate                                  │   │
│ │                                                     │   │
│ │ ┌───────────────────────────────────────────────┐ │   │
│ │ │ Conversion Breakdown                          │ │   │
│ │ │                                               │ │   │
│ │ │ 10 EUR = 11.00 USD                           │ │   │
│ │ │ 11.00 USD = 1,320.00 BDT                     │ │   │
│ │ │ ─────────────────────────────                │ │   │
│ │ │ Will be recorded as: 1,320.00 BDT            │ │   │
│ │ └───────────────────────────────────────────────┘ │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Conversion Rate Options

#### Default Rate
- Uses the conversion rate configured in workspace settings
- Automatically calculated and displayed
- Recommended for most transactions

#### Custom Rate
- Allows users to override the default rate
- Useful for:
  - Historical transactions with different rates
  - Special negotiated rates
  - Bank-specific exchange rates
- Still follows the two-step conversion chain

## Database Schema

### Expense Record

```sql
expense {
  amount          DECIMAL      -- Amount in expense account currency
  currency        VARCHAR      -- Original input currency
  rateType        ENUM         -- 'default' | 'custom'
  customRate      DECIMAL?     -- Custom conversion rate if used
  -- Other fields...
}
```

### Currency Rate Configuration

```sql
currencyRate {
  fromCurrency    VARCHAR      -- Always 'USD' (base)
  toCurrency      VARCHAR      -- Target currency
  rate            DECIMAL      -- Conversion rate
  isActive        BOOLEAN      
  organizationId  VARCHAR
}
```

**Note:** All currency rates are stored as USD-to-target conversions for consistency.

## Configuration

### Setting Up Currencies

1. **Workspace Level:**
   - USD is always the base currency (cannot be changed)
   - Configure conversion rates for additional currencies in workspace settings

2. **Expense Account Level:**
   - Select default currency when creating/editing an expense account
   - Can be USD or any configured currency
   - All expenses for this account will default to this currency

3. **Transaction Level:**
   - Users can select from USD + all configured workspace currencies
   - System handles conversion automatically

### Adding New Currencies

To add support for a new currency (e.g., JPY):

1. **Navigate to:** Workspace Settings → Currency Rates
2. **Add conversion rate:** USD to JPY (e.g., 150)
3. **Currency becomes available** in all expense account dropdowns

## Conversion Rate Management

### Rate Types

1. **Default Rate**
   - Configured at workspace level
   - Used for most transactions
   - Can be updated centrally

2. **Custom Rate**
   - Set per-transaction
   - Overrides default rate
   - Stored with the expense record

### Rate Updates

**Important:** Updating a workspace-level conversion rate:
- Does **NOT** affect historical transactions
- Only applies to new transactions using default rates
- Historical transactions preserve their original rates

## Reporting & Analytics

### Multi-Currency Reports

When generating reports across multiple expense accounts with different currencies:

1. **All amounts normalized to USD** (workspace base currency)
2. **Original currencies preserved** for reference
3. **Conversion rates documented** for audit trail

### Report Display

```
Expense Report - January 2024
─────────────────────────────────────────
Item          Original      USD Equivalent
─────────────────────────────────────────
Salary        50,000 BDT    416.67 USD
Software      99 EUR        108.90 USD
Marketing     5,000 BDT     41.67 USD
─────────────────────────────────────────
Total                       567.24 USD
```

## Best Practices

### For Workspace Administrators

1. **Set up all needed currencies** before creating expense accounts
2. **Update conversion rates regularly** to reflect current market rates
3. **Document any special rate arrangements** in expense descriptions
4. **Review currency configuration** when onboarding new expense accounts

### For Users

1. **Use default currency** whenever possible for consistency
2. **Only use custom rates** when necessary
3. **Document the reason** in description when using custom rates
4. **Verify conversion amounts** before submitting expenses

## Edge Cases & Considerations

### Same Currency Conversion

If expense account currency = input currency:
- **No conversion performed**
- **No conversion UI shown**
- Direct amount storage
- Simpler, faster workflow

### USD as Expense Account Currency

If expense account default currency is USD:
- Input Currency → USD (single conversion)
- Simplified conversion chain
- No second conversion step needed

### Currency Deactivation

When deactivating a currency in workspace settings:
- **Historical records preserved** with original rates
- **Currency removed** from dropdown for new transactions
- **Warning shown** if expense accounts use this as default currency

## Technical Implementation

### Frontend (CreateExpenseDialog)

```typescript
// Currency filtering
const availableCurrencies = ["USD"];
if (currencyRates) {
  for (const rate of currencyRates) {
    if (!availableCurrencies.includes(rate.toCurrency)) {
      availableCurrencies.push(rate.toCurrency);
    }
  }
}

// Conversion calculation
const calculateConversion = () => {
  if (selectedCurrency === accountCurrency) return null;
  
  let amountInUSD = amountValue;
  
  // Step 1: Input → USD
  if (selectedCurrency !== "USD") {
    const inputToUSDRate = getRate(selectedCurrency);
    amountInUSD = amountValue * inputToUSDRate;
  }
  
  // Step 2: USD → Account Currency
  if (accountCurrency !== "USD") {
    const usdToAccountRate = getRate(accountCurrency);
    finalAmount = amountInUSD * usdToAccountRate;
  }
  
  return { amountInUSD, finalAmount };
};
```

### Backend (API)

```typescript
// Conversion validation and calculation
async function createExpense(data) {
  const { currency, amount, customRate, rateType, businessId } = data;
  
  const business = await getExpenseAccount(businessId);
  const accountCurrency = business.currency;
  
  // Calculate converted amount
  let finalAmount = amount;
  if (currency !== accountCurrency) {
    const rate = rateType === "custom" 
      ? customRate 
      : await getDefaultRate(currency);
    
    // Two-step conversion
    const amountInUSD = currency === "USD" 
      ? amount 
      : amount * rate;
    
    finalAmount = accountCurrency === "USD"
      ? amountInUSD
      : amountInUSD * await getDefaultRate(accountCurrency);
  }
  
  // Store with metadata
  return await db.expense.create({
    data: {
      amount: finalAmount,
      currency,
      rateType,
      customRate,
      // ...
    }
  });
}
```

## Future Enhancements

### Planned Features

1. **Historical Rate Support**
   - Automatic historical rate lookup based on transaction date
   - API integration with currency rate providers

2. **Rate Alerts**
   - Notify administrators of significant rate changes
   - Suggested rate updates

3. **Bulk Rate Updates**
   - Import rates from CSV
   - API integration for automatic daily updates

4. **Multi-Base Currency**
   - Support for multiple base currencies per workspace
   - Useful for international organizations

## Troubleshooting

### Common Issues

**Issue:** Conversion rates not showing
- **Solution:** Ensure currency rates are configured in workspace settings

**Issue:** Incorrect conversion amounts
- **Solution:** Verify both conversion rates (Input→USD and USD→Account)

**Issue:** Currency not available in dropdown
- **Solution:** Add currency rate in workspace settings first

## Summary

The three-tier currency system provides:
- ✅ Flexibility for multi-currency operations
- ✅ Consistency through USD normalization
- ✅ Accuracy with preserved conversion metadata
- ✅ Simplicity with smart UI behavior
- ✅ Auditability with full conversion trail

This architecture supports complex international expense tracking while maintaining a clean user experience and accurate financial reporting.

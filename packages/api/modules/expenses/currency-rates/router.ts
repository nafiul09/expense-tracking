import { deleteCurrencyRateProcedure } from "./procedures/delete-currency-rate";
import { listCurrencyRatesProcedure } from "./procedures/list-currency-rates";
import { upsertCurrencyRateProcedure } from "./procedures/upsert-currency-rate";

export const currenciesRouter = {
	list: listCurrencyRatesProcedure,
	upsert: upsertCurrencyRateProcedure,
	delete: deleteCurrencyRateProcedure,
};

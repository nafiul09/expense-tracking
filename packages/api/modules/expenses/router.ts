import { analyticsRouter } from "./analytics/router";
import { expenseAccountsRouter } from "./businesses/router";
import { currenciesRouter } from "./currency-rates/router";
import { loansRouter } from "./loans/router";
import { createCategoryProcedure } from "./procedures/create-category";
import { createExpenseProcedure } from "./procedures/create-expense";
import { createPaymentMethodProcedure } from "./procedures/create-payment-method";
import { deleteExpenseProcedure } from "./procedures/delete-expense";
import { getExpenseDetailsProcedure } from "./procedures/get-expense-details";
import { listCategoriesProcedure } from "./procedures/list-categories";
import { listExpensesProcedure } from "./procedures/list-expenses";
import { listPaymentMethodsProcedure } from "./procedures/list-payment-methods";
import { updateExpenseProcedure } from "./procedures/update-expense";
import { reportsRouter } from "./reports/router";
import { subscriptionsRouter } from "./subscriptions/router";
import { teamMembersRouter } from "./team-members/router";

export const expensesRouter = {
	expenseAccounts: expenseAccountsRouter,
	currencies: currenciesRouter,
	teamMembers: teamMembersRouter,
	subscriptions: subscriptionsRouter,
	loans: loansRouter,
	analytics: analyticsRouter,
	reports: reportsRouter,
	create: createExpenseProcedure,
	list: listExpensesProcedure,
	getDetails: getExpenseDetailsProcedure,
	update: updateExpenseProcedure,
	delete: deleteExpenseProcedure,
	createCategory: createCategoryProcedure,
	listCategories: listCategoriesProcedure,
	createPaymentMethod: createPaymentMethodProcedure,
	listPaymentMethods: listPaymentMethodsProcedure,
};

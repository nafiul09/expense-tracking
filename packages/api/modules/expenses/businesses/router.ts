import { createExpenseAccountProcedure } from "./procedures/create-business";
import { deleteExpenseAccountProcedure } from "./procedures/delete-business";
import { getExpenseAccountDetailsProcedure } from "./procedures/get-business-details";
import { listExpenseAccountsProcedure } from "./procedures/list-businesses";
import { updateExpenseAccountProcedure } from "./procedures/update-business";

export const expenseAccountsRouter = {
	create: createExpenseAccountProcedure,
	update: updateExpenseAccountProcedure,
	delete: deleteExpenseAccountProcedure,
	list: listExpenseAccountsProcedure,
	getDetails: getExpenseAccountDetailsProcedure,
};

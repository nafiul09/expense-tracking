import { addLoanPaymentProcedure } from "./procedures/add-loan-payment";
import { createLoanProcedure } from "./procedures/create-loan";
import { getLoanHistoryProcedure } from "./procedures/get-loan-history";
import { listLoansProcedure } from "./procedures/list-loans";

export const loansRouter = {
	create: createLoanProcedure,
	list: listLoansProcedure,
	getHistory: getLoanHistoryProcedure,
	addPayment: addLoanPaymentProcedure,
};

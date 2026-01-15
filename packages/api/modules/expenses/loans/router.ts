import { addLoanPaymentProcedure } from "./procedures/add-loan-payment";
import { createLoanProcedure } from "./procedures/create-loan";
import { getLoanHistoryProcedure } from "./procedures/get-loan-history";
import { listLoansProcedure } from "./procedures/list-loans";
import { listAllLoansProcedure } from "./procedures/list-all-loans";

export const loansRouter = {
	create: createLoanProcedure,
	list: listLoansProcedure,
	listAll: listAllLoansProcedure,
	getHistory: getLoanHistoryProcedure,
	addPayment: addLoanPaymentProcedure,
};

import { createLoanProcedure } from "./procedures/create-loan";
import { deleteLoanProcedure } from "./procedures/delete-loan";
import { getLoanDetailsProcedure } from "./procedures/get-loan-details";
import { getLoanHistoryProcedure } from "./procedures/get-loan-history";
import { listAllLoansProcedure } from "./procedures/list-all-loans";
import { listLoansProcedure } from "./procedures/list-loans";
import { recordLoanPaymentProcedure } from "./procedures/record-payment";
import { updateLoanProcedure } from "./procedures/update-loan";

export const loansRouter = {
	create: createLoanProcedure,
	list: listLoansProcedure,
	listAll: listAllLoansProcedure,
	getDetails: getLoanDetailsProcedure,
	getHistory: getLoanHistoryProcedure,
	update: updateLoanProcedure,
	delete: deleteLoanProcedure,
	recordPayment: recordLoanPaymentProcedure,
};

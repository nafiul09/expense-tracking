import { addLoanPaymentProcedure } from "./procedures/add-loan-payment";
import { cancelStandaloneLoanProcedure } from "./procedures/cancel-standalone-loan";
import { createLoanProcedure } from "./procedures/create-loan";
import { createStandaloneLoanProcedure } from "./procedures/create-standalone-loan";
import { getLoanHistoryProcedure } from "./procedures/get-loan-history";
import { getStandaloneLoanDetailsProcedure } from "./procedures/get-standalone-loan-details";
import { listAllLoansProcedure } from "./procedures/list-all-loans";
import { listLoansProcedure } from "./procedures/list-loans";
import { listStandaloneLoansProcedure } from "./procedures/list-standalone-loans";
import { recordStandaloneLoanPaymentProcedure } from "./procedures/record-standalone-loan-payment";

export const loansRouter = {
	create: createLoanProcedure,
	list: listLoansProcedure,
	listAll: listAllLoansProcedure,
	getHistory: getLoanHistoryProcedure,
	addPayment: addLoanPaymentProcedure,
	// Standalone loan procedures
	createStandalone: createStandaloneLoanProcedure,
	listStandalone: listStandaloneLoansProcedure,
	getStandaloneDetails: getStandaloneLoanDetailsProcedure,
	recordStandalonePayment: recordStandaloneLoanPaymentProcedure,
	cancelStandalone: cancelStandaloneLoanProcedure,
};

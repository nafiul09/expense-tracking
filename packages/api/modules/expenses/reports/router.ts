import { generateMonthlyReportProcedure } from "./procedures/generate-monthly-report";
import { getReportDetailsProcedure } from "./procedures/get-report-details";
import { listReportsProcedure } from "./procedures/list-reports";

export const reportsRouter = {
	generate: generateMonthlyReportProcedure,
	list: listReportsProcedure,
	getDetails: getReportDetailsProcedure,
};

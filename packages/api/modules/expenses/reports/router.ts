import { generateCustomReportProcedure } from "./procedures/generate-custom-report";
import { generateMonthlyReportProcedure } from "./procedures/generate-monthly-report";
import { getReportDetailsProcedure } from "./procedures/get-report-details";
import { listReportsProcedure } from "./procedures/list-reports";

export const reportsRouter = {
	generate: generateMonthlyReportProcedure,
	generateCustom: generateCustomReportProcedure,
	list: listReportsProcedure,
	getDetails: getReportDetailsProcedure,
};

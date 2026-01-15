import { compareBusinessesProcedure } from "./procedures/compare-businesses";
import { getCategoryBreakdownProcedure } from "./procedures/get-category-breakdown";
import { getExpenseOverviewProcedure } from "./procedures/get-expense-overview";
import { getTeamMemberExpenseSummaryProcedure } from "./procedures/get-team-member-expense-summary";
import { getTrendAnalysisProcedure } from "./procedures/get-trend-analysis";

export const analyticsRouter = {
	getOverview: getExpenseOverviewProcedure,
	getCategoryBreakdown: getCategoryBreakdownProcedure,
	getTrendAnalysis: getTrendAnalysisProcedure,
	compareBusinesses: compareBusinessesProcedure,
	getTeamMemberExpenseSummary: getTeamMemberExpenseSummaryProcedure,
};

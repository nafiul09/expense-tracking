import { getWorkspaceUsage } from "./procedures/get-workspace-usage";
import { checkUsageLimit } from "./procedures/check-usage-limit";

export const usageRouter = {
	getWorkspaceUsage,
	checkUsageLimit,
};

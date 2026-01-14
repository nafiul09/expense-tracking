import { orpcClient } from "@shared/lib/orpc-client";

export const usageApi = {
	getWorkspaceUsage: async (organizationId: string) => {
		return orpcClient.usage.getWorkspaceUsage({
			organizationId,
		});
	},

	checkUsageLimit: async (organizationId: string, metricType: string) => {
		return orpcClient.usage.checkUsageLimit({
			organizationId,
			metricType,
		});
	},
};

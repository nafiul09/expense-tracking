import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import {
	getUsageForMetric,
	calculateLimitsForOrganization,
	checkUsageThreshold,
} from "../lib/usage-helper";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

const checkUsageLimitSchema = z.object({
	organizationId: z.string(),
	metricType: z.string(),
});

export const checkUsageLimit = protectedProcedure
	.input(checkUsageLimitSchema)
	.handler(async ({ input, context }) => {
		const { organizationId, metricType } = input;
		const userId = context.user.id;

		// Verify user is a member of this organization
		const membership = await verifyOrganizationMembership(
			organizationId,
			userId,
		);

		if (!membership) {
			throw new Error("User is not a member of this workspace");
		}

		// Get limits for the organization based on their plan
		const { limits } = await calculateLimitsForOrganization(organizationId);
		const limitValue = limits[metricType];
		const limit =
			typeof limitValue === "number" || limitValue === null
				? limitValue
				: null;

		// Get current usage
		const usage = await getUsageForMetric(organizationId, metricType);

		// Check threshold
		const threshold = checkUsageThreshold(usage.currentUsage, limit);

		return {
			canProceed: threshold.status !== "blocked",
			status: threshold.status,
			current: usage.currentUsage,
			limit,
			percentage: threshold.percentage,
		};
	});

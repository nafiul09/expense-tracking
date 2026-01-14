import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getWorkspaceUsageData } from "../lib/usage-helper";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

const getWorkspaceUsageSchema = z.object({
	organizationId: z.string(),
});

export const getWorkspaceUsage = protectedProcedure
	.input(getWorkspaceUsageSchema)
	.handler(async ({ input, context }) => {
		const { organizationId } = input;
		const userId = context.user.id;

		// Verify user is a member of this organization
		const membership = await verifyOrganizationMembership(
			organizationId,
			userId,
		);

		if (!membership) {
			throw new Error("User is not a member of this workspace");
		}

		const usageData = await getWorkspaceUsageData(organizationId);

		return usageData;
	});

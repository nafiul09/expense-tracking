import { ORPCError } from "@orpc/server";
import { getBusinessById, getTrendAnalysis } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getTrendAnalysisProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/analytics/trends",
		tags: ["Expenses"],
		summary: "Get trend analysis",
		description: "Get expense trends over time",
	})
	.input(
		z.object({
			businessId: z.string(),
			startDate: z.coerce.date(),
			endDate: z.coerce.date(),
			groupBy: z.enum(["day", "week", "month"]).default("month"),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, startDate, endDate, groupBy } = input;

		const business = await getBusinessById(businessId);

		if (!business) {
			throw new ORPCError("BAD_REQUEST", { message: "Business not found" });
		}

		const membership = await verifyOrganizationMembership(
			business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		const trends = await getTrendAnalysis(
			businessId,
			startDate,
			endDate,
			groupBy,
		);

		return trends;
	});

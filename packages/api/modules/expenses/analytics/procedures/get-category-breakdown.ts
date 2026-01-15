import { ORPCError } from "@orpc/server";
import { getBusinessById, getCategoryBreakdown } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getCategoryBreakdownProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/analytics/category-breakdown",
		tags: ["Expenses"],
		summary: "Get category breakdown",
		description: "Get expense breakdown by category",
	})
	.input(
		z.object({
			businessId: z.string(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, startDate, endDate } = input;

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

		const breakdown = await getCategoryBreakdown(
			businessId,
			startDate,
			endDate,
		);

		return breakdown;
	});

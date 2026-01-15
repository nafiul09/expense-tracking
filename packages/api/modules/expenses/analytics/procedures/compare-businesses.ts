import { ORPCError } from "@orpc/server";
import { compareBusinesses, getOrganizationById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const compareBusinessesProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/analytics/compare-businesses",
		tags: ["Expenses"],
		summary: "Compare businesses",
		description: "Compare expenses across businesses in a workspace",
	})
	.input(
		z.object({
			organizationId: z.string(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, startDate, endDate } = input;

		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST", "Organization not found");
		}

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const comparison = await compareBusinesses(
			organizationId,
			startDate,
			endDate,
		);

		return comparison;
	});

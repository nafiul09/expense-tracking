import { ORPCError } from "@orpc/server";
import {
	getExpenseReportsByOrganizationId,
	getOrganizationById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listReportsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/reports",
		tags: ["Expenses"],
		summary: "List reports",
		description: "List all generated expense reports",
	})
	.input(
		z.object({
			organizationId: z.string(),
			businessId: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, businessId } = input;

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

		const reports = await getExpenseReportsByOrganizationId(
			organizationId,
			businessId,
		);

		return reports;
	});

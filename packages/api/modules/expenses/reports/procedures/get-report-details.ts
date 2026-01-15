import { ORPCError } from "@orpc/server";
import { getExpenseReportById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const getReportDetailsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/reports/:id",
		tags: ["Expenses"],
		summary: "Get report details",
		description: "Get detailed information about a report",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id } = input;

		const report = await getExpenseReportById(id);

		if (!report) {
			throw new ORPCError("NOT_FOUND", "Report not found");
		}

		const membership = await verifyOrganizationMembership(
			report.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		return report;
	});

import { ORPCError } from "@orpc/server";
import { getBusinessById, getLoansByBusinessId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listLoansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans",
		tags: ["Expenses"],
		summary: "List loans",
		description: "List all loans for a business",
	})
	.input(
		z.object({
			businessId: z.string(),
			status: z.enum(["active", "paid", "partial"]).optional(),
			teamMemberId: z.string().optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, status, teamMemberId } = input;

		const business = await getBusinessById(businessId);

		if (!business) {
			throw new ORPCError("BAD_REQUEST", "Business not found");
		}

		const membership = await verifyOrganizationMembership(
			business.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const loans = await getLoansByBusinessId(
			businessId,
			status,
			teamMemberId,
		);

		return loans;
	});

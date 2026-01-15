import { ORPCError } from "@orpc/server";
import { getBusinessById, getExpensesByBusinessId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const listExpensesProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses",
		tags: ["Expenses"],
		summary: "List expenses",
		description: "List expenses with optional filters",
	})
	.input(
		z.object({
			businessId: z.string(),
			categoryId: z.string().optional(),
			teamMemberId: z.string().optional(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
			limit: z.number().int().positive().max(100).default(50),
			offset: z.number().int().nonnegative().default(0),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { businessId, ...options } = input;

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

		const expenses = await getExpensesByBusinessId(businessId, options);

		return expenses;
	});

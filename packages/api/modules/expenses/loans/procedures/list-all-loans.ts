import { ORPCError } from "@orpc/server";
import { getAllLoansByOrganizationId } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listAllLoansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/loans/all",
		tags: ["Expenses"],
		summary: "List all loans",
		description: "List all loans across all expense accounts in an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			accountIds: z.array(z.string()).optional(),
			loanType: z.enum(["given", "taken"]).optional(),
			status: z.string().optional(),
			partyName: z.string().optional(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
			limit: z.number().int().positive().max(100).default(50),
			offset: z.number().int().nonnegative().default(0),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, ...options } = input;

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		const loans = await getAllLoansByOrganizationId(organizationId, options);

		return loans;
	});

import { ORPCError } from "@orpc/server";
import {
	getExpenseAccountsByOrganizationId,
	getOrganizationById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listExpenseAccountsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/expense-accounts",
		tags: ["Expenses"],
		summary: "List all expense accounts",
		description: "List all expense accounts in a workspace",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId } = input;

		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST", { message: "Organization not found" });
		}

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", { message: "Not a member of this workspace" });
		}

		const expenseAccounts =
			await getExpenseAccountsByOrganizationId(organizationId);

		return expenseAccounts;
	});

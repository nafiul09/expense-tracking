import { ORPCError } from "@orpc/server";
import { createExpenseAccount, getOrganizationById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createExpenseAccountProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/expense-accounts",
		tags: ["Expenses"],
		summary: "Create a new expense account",
		description: "Create a new expense account within a workspace",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(255),
			description: z.string().optional(),
			currency: z.string().default("USD"),
			type: z.enum(["personal", "business"]).default("business"),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, name, description, currency, type } = input;

		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Organization not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can create expense accounts
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can create expense accounts",
			});
		}

		const expenseAccount = await createExpenseAccount({
			organizationId,
			name,
			description,
			currency,
			type,
		});

		return expenseAccount;
	});

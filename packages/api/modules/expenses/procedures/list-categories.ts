import { ORPCError } from "@orpc/server";
import {
	getExpenseCategoriesByOrganizationId,
	getOrganizationById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { ensureDefaultCategories } from "../lib/category-init";

export const listCategoriesProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/categories",
		tags: ["Expenses"],
		summary: "List expense categories",
		description: "List all expense categories for a workspace",
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
			throw new ORPCError("BAD_REQUEST", "Organization not found");
		}

		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		// Ensure default categories exist
		await ensureDefaultCategories(organizationId);

		const categories =
			await getExpenseCategoriesByOrganizationId(organizationId);

		return categories;
	});

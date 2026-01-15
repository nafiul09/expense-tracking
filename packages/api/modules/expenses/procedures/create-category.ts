import { ORPCError } from "@orpc/server";
import { createExpenseCategory, getOrganizationById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const createCategoryProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/categories",
		tags: ["Expenses"],
		summary: "Create a new expense category",
		description: "Create a custom expense category",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(255),
			type: z.enum(["default", "custom"]).default("custom"),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, name, type } = input;

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

		// Only owners and admins can create categories
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can create categories",
			);
		}

		const category = await createExpenseCategory({
			organizationId,
			name,
			type,
		});

		return category;
	});

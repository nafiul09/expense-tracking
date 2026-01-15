import { ORPCError } from "@orpc/server";
import { createPaymentMethod, getOrganizationById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const createPaymentMethodProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/payment-methods",
		tags: ["Expenses"],
		summary: "Create a new payment method",
		description: "Create a payment method for tracking expenses",
	})
	.input(
		z.object({
			organizationId: z.string(),
			name: z.string().min(1).max(255),
			type: z.enum([
				"credit_card",
				"debit_card",
				"bank_account",
				"cash",
				"other",
			]),
			lastFourDigits: z.string().max(4).optional(),
			isDefault: z.boolean().default(false),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { organizationId, ...data } = input;

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

		// Only owners and admins can create payment methods
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can create payment methods",
			);
		}

		const paymentMethod = await createPaymentMethod({
			organizationId,
			...data,
		});

		return paymentMethod;
	});

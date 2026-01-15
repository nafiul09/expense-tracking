import { ORPCError } from "@orpc/server";
import {
	getOrganizationById,
	getPaymentMethodsByOrganizationId,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";

export const listPaymentMethodsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/payment-methods",
		tags: ["Expenses"],
		summary: "List payment methods",
		description: "List all payment methods for a workspace",
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

		const paymentMethods =
			await getPaymentMethodsByOrganizationId(organizationId);

		return paymentMethods;
	});

import { ORPCError } from "@orpc/server";
import { getCurrencyRatesByOrganization } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const listCurrencyRatesProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/expenses/currencies",
		tags: ["Expenses"],
		summary: "List currencies",
		description:
			"Get all currencies with conversion rates and formatting for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const membership = await verifyOrganizationMembership(
			input.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", "Not a member of this workspace");
		}

		const rates = await getCurrencyRatesByOrganization(
			input.organizationId,
		);

		return rates;
	});

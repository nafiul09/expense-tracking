import { ORPCError } from "@orpc/server";
import { config } from "@repo/config";
import { upsertCurrencyRate } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const upsertCurrencyRateProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/currencies",
		tags: ["Expenses"],
		summary: "Create or update currency",
		description:
			"Create or update a currency with conversion rate and formatting options",
	})
	.input(
		z.object({
			organizationId: z.string(),
			toCurrency: z
				.string()
				.refine(
					(currency) =>
						config.expenses.supportedCurrencies.includes(currency),
					{
						message: `Currency must be one of: ${config.expenses.supportedCurrencies.join(", ")}`,
					},
				),
			rate: z.number().positive(),
			symbol: z.string().optional(),
			symbolPosition: z
				.enum(["left", "right"])
				.default("left")
				.optional(),
			separator: z.string().default(",").optional(),
			decimalSeparator: z.string().default(".").optional(),
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

		// Only owners and admins can manage currency rates
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError(
				"FORBIDDEN",
				"Only owners and admins can manage currency rates",
			);
		}

		// Cannot set rate for base currency
		if (input.toCurrency === config.expenses.defaultBaseCurrency) {
			throw new ORPCError(
				"BAD_REQUEST",
				`Cannot set conversion rate for base currency (${config.expenses.defaultBaseCurrency})`,
			);
		}

		const rate = await upsertCurrencyRate({
			organizationId: input.organizationId,
			toCurrency: input.toCurrency,
			rate: input.rate,
			symbol: input.symbol,
			symbolPosition: input.symbolPosition,
			separator: input.separator,
			decimalSeparator: input.decimalSeparator,
			updatedBy: user.id,
		});

		return rate;
	});

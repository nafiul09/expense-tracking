import { ORPCError } from "@orpc/server";
import {
	countExpenseAccountsByCurrency,
	countExpensesByCurrency,
	deleteCurrencyRate,
	getCurrencyRateById,
} from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const deleteCurrencyRateProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/expenses/currencies/:id",
		tags: ["Expenses"],
		summary: "Delete currency",
		description: "Delete a currency configuration",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const rate = await getCurrencyRateById(input.id);

		if (!rate) {
			throw new ORPCError("NOT_FOUND", {
				message: "Currency rate not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			rate.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can delete currency rates
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can delete currency rates",
			});
		}

		// Check if currency is used by any expense accounts
		const expenseAccountCount = await countExpenseAccountsByCurrency(
			rate.organizationId,
			rate.toCurrency,
		);

		if (expenseAccountCount > 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Cannot delete currency ${rate.toCurrency}. It is currently used by ${expenseAccountCount} expense account(s). Please update or delete those expense accounts first.`,
			});
		}

		// Check if currency is used by any expenses
		const expenseCount = await countExpensesByCurrency(
			rate.organizationId,
			rate.toCurrency,
		);

		if (expenseCount > 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Cannot delete currency ${rate.toCurrency}. It is currently used by ${expenseCount} expense(s). Please update or delete those expenses first.`,
			});
		}

		await deleteCurrencyRate(input.id);

		return { success: true };
	});

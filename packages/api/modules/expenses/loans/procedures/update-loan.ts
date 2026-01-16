import { ORPCError } from "@orpc/server";
import { getLoanById, updateLoan } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const updateLoanProcedure = protectedProcedure
	.route({
		method: "PUT",
		path: "/expenses/loans/:id",
		tags: ["Expenses"],
		summary: "Update a loan",
		description: "Update loan details",
	})
	.input(
		z.object({
			id: z.string(),
			partyName: z.string().min(1).optional(),
			partyContact: z.string().optional().nullable(),
			interestRate: z.number().nonnegative().optional().nullable(),
			interestType: z.enum(["simple", "compound"]).optional().nullable(),
			dueDate: z.coerce.date().optional().nullable(),
			collateral: z.string().optional().nullable(),
			notes: z.string().optional().nullable(),
			status: z.enum(["active", "paid", "defaulted", "cancelled"]).optional(),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { id, ...updateData } = input;

		const loan = await getLoanById(id);

		if (!loan) {
			throw new ORPCError("NOT_FOUND", {
				message: "Loan not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			loan.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Only owners and admins can update loans
		if (membership.role !== "owner" && membership.role !== "admin") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only owners and admins can update loans",
			});
		}

		const updatedLoan = await updateLoan({
			id,
			...updateData,
		});

		return updatedLoan;
	});

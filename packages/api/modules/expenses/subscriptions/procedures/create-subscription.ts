import { ORPCError } from "@orpc/server";
import { createSubscription, getExpenseById } from "@repo/database";
import z from "zod";
import { protectedProcedure } from "../../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../../organizations/lib/membership";

export const createSubscriptionProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/expenses/subscriptions",
		tags: ["Expenses"],
		summary: "Create a new subscription",
		description: "Create a subscription expense with renewal tracking",
	})
	.input(
		z.object({
			expenseId: z.string(),
			renewalDate: z.coerce.date(),
			renewalFrequency: z
				.enum(["monthly", "yearly", "weekly", "custom"])
				.default("monthly"),
			autoRenew: z.boolean().default(true),
			reminderDays: z.number().int().min(1).max(30).default(7),
			status: z.enum(["active", "cancelled", "paused"]).default("active"),
		}),
	)
	.handler(async ({ context: { user }, input }) => {
		const { expenseId, reminderDays, ...data } = input;

		const expense = await getExpenseById(expenseId);

		if (!expense) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Expense not found",
			});
		}

		const membership = await verifyOrganizationMembership(
			expense.expenseAccount.organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not a member of this workspace",
			});
		}

		// Calculate next reminder date
		const nextReminderDate = new Date(input.renewalDate);
		nextReminderDate.setDate(nextReminderDate.getDate() - reminderDays);

		// Create subscription using new model (legacy: links to existing expense)
		const subscription = await createSubscription({
			expenseAccountId: expense.expenseAccount.id,
			title: expense.title,
			description: expense.description || undefined,
			amount: Number(expense.amount),
			currency:
				expense.currency || expense.expenseAccount.currency || "USD",
			startDate: expense.date,
			renewalDate: input.renewalDate,
			renewalFrequency: input.renewalFrequency,
			reminderDays: input.reminderDays,
			nextReminderDate,
			status: input.status,
		});

		// Link expense to subscription
		const { db } = await import("@repo/database");
		await db.expense.update({
			where: { id: expense.id },
			data: { subscriptionId: subscription.id },
		});

		return subscription;
	});

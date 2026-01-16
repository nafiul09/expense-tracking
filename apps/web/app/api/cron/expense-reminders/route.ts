import {
	createExpenseReminder,
	getSubscriptionsNeedingReminder,
	updateSubscriptionNextReminderDate,
} from "@repo/database";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	// Verify cron secret
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const subscriptions = await getSubscriptionsNeedingReminder();
		const baseUrl = getBaseUrl();

		for (const subscription of subscriptions) {
			const expenseAccount = subscription.expenseAccount;
			const organization = expenseAccount.organization;

			// Calculate next reminder date
			const nextReminderDate = new Date(subscription.renewalDate);
			nextReminderDate.setDate(
				nextReminderDate.getDate() - subscription.reminderDays,
			);

			// Send reminder to all organization members
			for (const member of organization.members) {
				const user = member.user;
				if (!user.email) continue;

				const url = `${baseUrl}/${organization.slug}/expense-accounts/${expenseAccount.id}/subscriptions/${subscription.id}`;

				await sendEmail({
					to: user.email,
					templateId: "subscriptionRenewalReminder",
					context: {
						url,
						subscriptionName: subscription.title,
						renewalDate:
							subscription.renewalDate.toLocaleDateString(),
						businessName: expenseAccount.name,
						amount: Number(subscription.amount),
						currency:
							subscription.currency || expenseAccount.currency,
					},
				});
			}

			// Update next reminder date
			await updateSubscriptionNextReminderDate(
				subscription.id,
				nextReminderDate,
			);

			// Create reminder record
			await createExpenseReminder({
				subscriptionId: subscription.id,
				reminderType: "renewal",
				scheduledDate: new Date(),
				status: "sent",
			});
		}

		return NextResponse.json({
			success: true,
			remindersSent: subscriptions.length,
		});
	} catch (error) {
		console.error("Error processing expense reminders:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

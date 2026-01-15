import { db } from "../client";

export async function getSubscriptionsNeedingReminder() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return db.subscription.findMany({
		where: {
			status: "active",
			nextReminderDate: {
				lte: today,
			},
		},
		include: {
			expense: {
				include: {
					business: {
						include: {
							organization: {
								include: {
									members: {
										include: {
											user: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});
}

export async function updateSubscriptionNextReminderDate(
	id: string,
	nextReminderDate: Date,
) {
	return db.subscription.update({
		where: { id },
		data: { nextReminderDate },
	});
}

export async function createExpenseReminder(data: {
	subscriptionId: string;
	reminderType: string;
	scheduledDate: Date;
	status?: string;
	emailContent?: string;
}) {
	return db.expenseReminder.create({
		data,
	});
}

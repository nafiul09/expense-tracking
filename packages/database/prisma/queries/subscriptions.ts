import { db } from "../client";
import type { SubscriptionUpdateInput } from "../generated/models/Subscription";

export async function getSubscriptionById(id: string) {
	return db.subscription.findUnique({
		where: { id },
		include: {
			expenseAccount: true,
			expenses: {
				include: {
					category: true,
					teamMember: true,
					paymentMethod: true,
				},
				orderBy: {
					date: "desc",
				},
			},
			reminders: {
				orderBy: {
					scheduledDate: "desc",
				},
			},
		},
	});
}

export async function getSubscriptionByExpenseId(expenseId: string) {
	return db.subscription.findFirst({
		where: {
			expenses: {
				some: {
					id: expenseId,
				},
			},
		},
		include: {
			expenseAccount: true,
			expenses: {
				where: {
					id: expenseId,
				},
			},
		},
	});
}

export async function getSubscriptionsByBusinessId(
	businessId: string,
	status?: string,
) {
	const where: any = {
		expenseAccountId: businessId,
	};

	if (status) {
		where.status = status;
	}

	return db.subscription.findMany({
		where,
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			expenses: {
				select: {
					id: true,
					amount: true,
					date: true,
				},
				orderBy: {
					date: "desc",
				},
			},
		},
		orderBy: {
			renewalDate: "asc",
		},
	});
}

export async function getAllSubscriptionsByOrganizationId(
	organizationId: string,
	options?: {
		accountIds?: string[];
		status?: string;
		renewalFrequency?: string;
		nextRenewalStart?: Date;
		nextRenewalEnd?: Date;
	},
) {
	const where: any = {
		expenseAccount: {
			organizationId,
		},
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.expenseAccountId = { in: options.accountIds };
	}

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.renewalFrequency) {
		where.renewalFrequency = options.renewalFrequency;
	}

	if (options?.nextRenewalStart || options?.nextRenewalEnd) {
		where.renewalDate = {};
		if (options.nextRenewalStart) {
			where.renewalDate.gte = options.nextRenewalStart;
		}
		if (options.nextRenewalEnd) {
			where.renewalDate.lte = options.nextRenewalEnd;
		}
	}

	return db.subscription.findMany({
		where,
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			expenses: {
				select: {
					id: true,
					amount: true,
					date: true,
				},
				orderBy: {
					date: "desc",
				},
			},
		},
		orderBy: {
			renewalDate: "asc",
		},
	});
}

export async function getUpcomingRenewals(businessId: string, days = 30) {
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + days);

	return db.subscription.findMany({
		where: {
			expenseAccountId: businessId,
			status: "active",
			renewalDate: {
				lte: endDate,
			},
		},
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			expenses: {
				select: {
					id: true,
					amount: true,
					date: true,
				},
				orderBy: {
					date: "desc",
				},
			},
		},
		orderBy: {
			renewalDate: "asc",
		},
	});
}

export async function createSubscription(data: {
	expenseAccountId: string;
	title: string;
	description?: string;
	provider?: string;
	currentAmount: number;
	currency?: string;
	startDate: Date;
	renewalDate: Date;
	renewalFrequency?: string;
	renewalType?: string;
	autoRenew?: boolean;
	reminderDays?: number;
	nextReminderDate?: Date;
	status?: string;
	expenseId?: string; // Legacy field for migration
}) {
	return db.subscription.create({
		data,
	});
}

export async function updateSubscription(
	data: SubscriptionUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;
	return db.subscription.update({
		where: { id },
		data: updateData as SubscriptionUpdateInput,
	});
}

export async function cancelSubscription(id: string) {
	return db.subscription.update({
		where: { id },
		data: {
			status: "cancelled",
			cancelationDate: new Date(),
			autoRenew: false,
		},
	});
}

export async function deactivateSubscription(id: string) {
	return db.subscription.update({
		where: { id },
		data: {
			status: "inactive",
		},
	});
}

export async function deleteSubscription(id: string) {
	// First, unlink all expenses from this subscription
	await db.expense.updateMany({
		where: { subscriptionId: id },
		data: { subscriptionId: null },
	});

	// Then delete the subscription
	return db.subscription.delete({
		where: { id },
	});
}

// Calculate total paid for a subscription (sum of all linked expenses)
export async function getSubscriptionTotalPaid(subscriptionId: string) {
	const result = await db.expense.aggregate({
		where: {
			subscriptionId,
		},
		_sum: {
			amount: true,
		},
	});

	return result._sum.amount || 0;
}

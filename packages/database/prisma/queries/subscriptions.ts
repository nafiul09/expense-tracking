import type { SubscriptionUpdateInput } from "../generated/models/Subscription";
import { db } from "../client";

export async function getSubscriptionById(id: string) {
	return db.subscription.findUnique({
		where: { id },
		include: {
			expense: {
				include: {
					expenseAccount: true,
					category: true,
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
	return db.subscription.findUnique({
		where: { expenseId },
		include: {
			expense: {
				include: {
					expenseAccount: true,
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
		expense: {
			businessId,
		},
	};

	if (status) {
		where.status = status;
	}

	return db.subscription.findMany({
		where,
		include: {
			expense: {
				include: {
					expenseAccount: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
					category: true,
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
		expense: {
			expenseAccount: {
				organizationId,
			},
		},
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.expense.businessId = { in: options.accountIds };
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
			expense: {
				include: {
					expenseAccount: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
					category: true,
				},
			},
		},
		orderBy: {
			renewalDate: "asc",
		},
	});
}

export async function getUpcomingRenewals(
	businessId: string,
	days: number = 30,
) {
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + days);

	return db.subscription.findMany({
		where: {
			expense: {
				businessId,
			},
			status: "active",
			renewalDate: {
				lte: endDate,
			},
		},
		include: {
			expense: {
				include: {
					expenseAccount: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
					category: true,
				},
			},
		},
		orderBy: {
			renewalDate: "asc",
		},
	});
}

export async function createSubscription(data: {
	expenseId: string;
	renewalDate: Date;
	renewalFrequency?: string;
	autoRenew?: boolean;
	reminderDays?: number;
	nextReminderDate?: Date;
	provider?: string;
	status?: string;
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

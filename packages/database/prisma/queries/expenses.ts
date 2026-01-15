import { db } from "../client";
import type { ExpenseUpdateInput } from "../generated/models/Expense";

export async function getExpenseById(id: string) {
	return db.expense.findUnique({
		where: { id },
		include: {
			business: true,
			category: true,
			teamMember: true,
			paymentMethod: true,
			subscription: true,
			loan: true,
		},
	});
}

export async function getExpensesByBusinessId(
	businessId: string,
	options?: {
		categoryId?: string;
		teamMemberId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	},
) {
	const where: any = {
		businessId,
	};

	if (options?.categoryId) {
		where.categoryId = options.categoryId;
	}

	if (options?.teamMemberId) {
		where.teamMemberId = options.teamMemberId;
	}

	if (options?.startDate || options?.endDate) {
		where.date = {};
		if (options.startDate) {
			where.date.gte = options.startDate;
		}
		if (options.endDate) {
			where.date.lte = options.endDate;
		}
	}

	return db.expense.findMany({
		where,
		include: {
			category: true,
			teamMember: true,
			paymentMethod: true,
		},
		orderBy: {
			date: "desc",
		},
		take: options?.limit,
		skip: options?.offset,
	});
}

export async function createExpense(data: {
	businessId: string;
	categoryId: string;
	teamMemberId?: string;
	paymentMethodId?: string;
	title: string;
	description?: string;
	amount: number;
	currency?: string;
	conversionRate?: number;
	rateType?: string;
	baseCurrencyAmount?: number;
	date: Date;
	receiptUrl?: string;
	status?: string;
	metadata?: any;
	createdBy: string;
}) {
	return db.expense.create({
		data,
	});
}

export async function updateExpense(data: ExpenseUpdateInput & { id: string }) {
	const { id, ...updateData } = data;
	return db.expense.update({
		where: { id },
		data: updateData as ExpenseUpdateInput,
	});
}

export async function deleteExpense(id: string) {
	return db.expense.delete({
		where: { id },
	});
}

export async function getExpensesTotalByBusinessId(
	businessId: string,
	startDate?: Date,
	endDate?: Date,
) {
	const where: any = {
		businessId,
		status: "active",
	};

	if (startDate || endDate) {
		where.date = {};
		if (startDate) {
			where.date.gte = startDate;
		}
		if (endDate) {
			where.date.lte = endDate;
		}
	}

	const result = await db.expense.aggregate({
		where,
		_sum: {
			amount: true,
		},
	});

	return result._sum.amount || 0;
}

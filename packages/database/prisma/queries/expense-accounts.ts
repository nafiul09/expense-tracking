import { db } from "../client";
import type { ExpenseAccountUpdateInput } from "../generated/models/ExpenseAccount";

export async function getExpenseAccountById(id: string) {
	return db.expenseAccount.findUnique({
		where: { id },
		include: {
			organization: true,
			_count: {
				select: {
					teamMembers: true,
					expenses: true,
				},
			},
		},
	});
}

export async function getExpenseAccountsByOrganizationId(
	organizationId: string,
) {
	return db.expenseAccount.findMany({
		where: { organizationId },
		include: {
			_count: {
				select: {
					teamMembers: true,
					expenses: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
}

export async function createExpenseAccount(data: {
	organizationId: string;
	name: string;
	description?: string;
	currency?: string;
	type?: string;
}) {
	return db.expenseAccount.create({
		data,
	});
}

export async function updateExpenseAccount(
	data: ExpenseAccountUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;
	return db.expenseAccount.update({
		where: { id },
		data: updateData as ExpenseAccountUpdateInput,
	});
}

export async function deleteExpenseAccount(id: string) {
	return db.expenseAccount.delete({
		where: { id },
	});
}

// Legacy aliases for backward compatibility during migration
export const getBusinessById = getExpenseAccountById;
export const getBusinessesByOrganizationId = getExpenseAccountsByOrganizationId;
export const createBusiness = createExpenseAccount;
export const updateBusiness = updateExpenseAccount;
export const deleteBusiness = deleteExpenseAccount;

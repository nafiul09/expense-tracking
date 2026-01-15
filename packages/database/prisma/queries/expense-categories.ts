import type { ExpenseCategoryUpdateInput } from "../generated/models/ExpenseCategory";
import { db } from "../client";

export async function getExpenseCategoryById(id: string) {
	return db.expenseCategory.findUnique({
		where: { id },
	});
}

export async function getExpenseCategoriesByOrganizationId(
	organizationId: string,
) {
	return db.expenseCategory.findMany({
		where: {
			organizationId,
			isActive: true,
		},
		orderBy: {
			createdAt: "asc",
		},
	});
}

export async function createExpenseCategory(data: {
	organizationId: string;
	name: string;
	type?: string;
	isActive?: boolean;
}) {
	return db.expenseCategory.create({
		data,
	});
}

export async function updateExpenseCategory(
	data: ExpenseCategoryUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;
	return db.expenseCategory.update({
		where: { id },
		data: updateData as ExpenseCategoryUpdateInput,
	});
}

export async function deleteExpenseCategory(id: string) {
	return db.expenseCategory.delete({
		where: { id },
	});
}

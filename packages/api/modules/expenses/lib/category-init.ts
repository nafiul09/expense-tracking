import { config } from "@repo/config";
import {
	createExpenseCategory,
	getExpenseCategoriesByOrganizationId,
} from "@repo/database";

export async function ensureDefaultCategories(organizationId: string) {
	const existingCategories =
		await getExpenseCategoriesByOrganizationId(organizationId);

	const existingCategoryNames = new Set(
		existingCategories.map((cat) => cat.name.toLowerCase()),
	);

	const defaultCategories = config.expenses.defaultCategories;

	for (const categoryName of defaultCategories) {
		if (!existingCategoryNames.has(categoryName.toLowerCase())) {
			await createExpenseCategory({
				organizationId,
				name: categoryName,
				type: "default",
				isActive: true,
			});
		}
	}
}

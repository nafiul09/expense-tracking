import { getActiveOrganization } from "@saas/auth/lib/server";
import ExpenseDashboard from "@saas/expenses/components/ExpenseDashboard";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	return {
		title: activeOrganization
			? `Expense Accounts - ${activeOrganization.name}`
			: "Expense Accounts",
	};
}

export default async function ExpenseAccountsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations();

	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	if (!activeOrganization) {
		return notFound();
	}

	return (
		<div>
			<PageHeader
				title={t("expenses.expenseAccounts.title")}
				subtitle={t("expenses.expenseAccounts.subtitle")}
			/>

			<ExpenseDashboard organizationId={activeOrganization.id} />
		</div>
	);
}

import { getActiveOrganization } from "@saas/auth/lib/server";
import BusinessDashboard from "@saas/expenses/components/BusinessDashboard";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string; businessId: string }>;
}) {
	const { organizationSlug, businessId } = await params;
	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	return {
		title: activeOrganization
			? `Expense Account Expenses - ${activeOrganization.name}`
			: "Expense Account Expenses",
	};
}

export default async function BusinessExpensesPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; businessId: string }>;
}) {
	const { organizationSlug, businessId } = await params;
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
				title={t("expenses.expenseAccount.title")}
				subtitle={t("expenses.expenseAccount.subtitle")}
			/>

			<BusinessDashboard businessId={businessId} />
		</div>
	);
}

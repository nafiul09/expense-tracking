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
			? `Expenses - ${activeOrganization.name}`
			: "Expenses",
	};
}

export default async function ExpensesPage({
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
				title={t("expenses.dashboard.title")}
				subtitle={t("expenses.dashboard.subtitle")}
			/>

			<ExpenseDashboard organizationId={activeOrganization.id} />
		</div>
	);
}

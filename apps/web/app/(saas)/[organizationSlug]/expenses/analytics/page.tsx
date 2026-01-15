import { getActiveOrganization } from "@saas/auth/lib/server";
import AnalyticsDashboard from "@saas/expenses/components/AnalyticsDashboard";
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
			? `Analytics - ${activeOrganization.name}`
			: "Analytics",
	};
}

export default async function AnalyticsPage({
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
				title={t("expenses.analytics.title")}
				subtitle={t("expenses.analytics.subtitle")}
			/>

			<AnalyticsDashboard organizationId={activeOrganization.id} />
		</div>
	);
}

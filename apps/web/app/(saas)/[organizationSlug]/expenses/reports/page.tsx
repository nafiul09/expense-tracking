import { getActiveOrganization } from "@saas/auth/lib/server";
import ReportsList from "@saas/expenses/components/ReportsList";
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
			? `Reports - ${activeOrganization.name}`
			: "Reports",
	};
}

export default async function ReportsPage({
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
				title={t("expenses.reports.title")}
				subtitle={t("expenses.reports.subtitle")}
			/>

			<ReportsList organizationId={activeOrganization.id} />
		</div>
	);
}

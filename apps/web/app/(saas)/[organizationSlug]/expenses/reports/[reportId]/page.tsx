import { getActiveOrganization } from "@saas/auth/lib/server";
import ReportViewer from "@saas/expenses/components/ReportViewer";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string; reportId: string }>;
}) {
	const { organizationSlug } = await params;
	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	return {
		title: activeOrganization
			? `Report - ${activeOrganization.name}`
			: "Report",
	};
}

export default async function ReportPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; reportId: string }>;
}) {
	const { organizationSlug, reportId } = await params;
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
				title={t("expenses.reports.view")}
				subtitle={t("expenses.reports.viewSubtitle")}
			/>

			<ReportViewer reportId={reportId} />
		</div>
	);
}

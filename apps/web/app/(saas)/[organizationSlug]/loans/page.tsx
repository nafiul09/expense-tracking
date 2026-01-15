import { getActiveOrganization } from "@saas/auth/lib/server";
import ConsolidatedLoansDashboard from "@saas/expenses/components/ConsolidatedLoansDashboard";
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
			? `Team Member Loans - ${activeOrganization.name}`
			: "Team Member Loans",
	};
}

export default async function ConsolidatedLoansPage({
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
				title={t("expenses.loans.consolidated.title")}
				subtitle={t("expenses.loans.consolidated.subtitle")}
			/>

			<ConsolidatedLoansDashboard
				organizationId={activeOrganization.id}
			/>
		</div>
	);
}

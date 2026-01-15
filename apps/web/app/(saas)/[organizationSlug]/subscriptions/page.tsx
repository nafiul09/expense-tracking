import { getActiveOrganization } from "@saas/auth/lib/server";
import ConsolidatedSubscriptionsDashboard from "@saas/expenses/components/ConsolidatedSubscriptionsDashboard";
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
			? `All Subscriptions - ${activeOrganization.name}`
			: "All Subscriptions",
	};
}

export default async function ConsolidatedSubscriptionsPage({
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
				title={t("expenses.subscriptions.consolidated.title")}
				subtitle={t("expenses.subscriptions.consolidated.subtitle")}
			/>

			<ConsolidatedSubscriptionsDashboard
				organizationId={activeOrganization.id}
			/>
		</div>
	);
}

import { getActiveOrganization } from "@saas/auth/lib/server";
import ConsolidatedTeamMembersDashboard from "@saas/expenses/components/ConsolidatedTeamMembersDashboard";
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
			? `Team Members - ${activeOrganization.name}`
			: "Team Members",
	};
}

export default async function ConsolidatedTeamMembersPage({
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
				title={t("expenses.teamMembers.consolidated.title")}
				subtitle={t("expenses.teamMembers.consolidated.subtitle")}
			/>

			<ConsolidatedTeamMembersDashboard
				organizationId={activeOrganization.id}
			/>
		</div>
	);
}

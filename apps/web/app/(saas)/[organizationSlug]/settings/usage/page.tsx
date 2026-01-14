import { getActiveOrganization } from "@saas/auth/lib/server";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { UsageSection } from "@saas/usage";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("settings.usage.title"),
	};
}

export default async function UsageSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return notFound();
	}

	return (
		<SettingsList>
			<UsageSection organizationId={organization.id} />
		</SettingsList>
	);
}

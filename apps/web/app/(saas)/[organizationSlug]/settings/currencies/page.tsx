import { getActiveOrganization } from "@saas/auth/lib/server";
import { CurrencyRatesSettings } from "@saas/expenses/components/CurrencyRatesSettings";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const t = await getTranslations();

	return {
		title: t("expenses.currencies.title"),
	};
}

export default async function CurrencyRatesSettingsPage({
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
			<CurrencyRatesSettings organizationId={organization.id} />
		</SettingsList>
	);
}

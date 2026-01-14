import { CustomDomainSettings } from "@saas/settings/components/CustomDomainSettings";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { getTranslations } from "next-intl/server";
import {
	getPurchasesByOrganizationId,
	getOrganizationById,
} from "@repo/database";
import { createPurchasesHelper } from "@repo/payments";
import { config } from "@repo/config";

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("organizations.settings.branding.title"),
	};
}

export default async function BrandingSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		return null;
	}

	// Fetch full organization with custom domain fields
	const fullOrganization = await getOrganizationById(organization.id);

	if (!fullOrganization) {
		return null;
	}

	// Check plan access
	const purchases = await getPurchasesByOrganizationId(organization.id);
	const { activePlan } = createPurchasesHelper(purchases);

	let hasCustomDomainAccess = false;
	if (!activePlan) {
		const freePlan = config.payments.plans.free;
		const limitValue = freePlan.limits?.customDomain;
		if (typeof limitValue === "boolean") {
			hasCustomDomainAccess = limitValue;
		}
	} else {
		const planConfig = config.payments.plans[activePlan.id];
		if (planConfig?.limits) {
			const limitValue = planConfig.limits.customDomain;
			if (typeof limitValue === "boolean") {
				hasCustomDomainAccess = limitValue;
			} else {
				hasCustomDomainAccess = limitValue !== false;
			}
		}
	}

	return (
		<SettingsList>
			<CustomDomainSettings
				organization={fullOrganization}
				hasAccess={hasCustomDomainAccess}
			/>
		</SettingsList>
	);
}

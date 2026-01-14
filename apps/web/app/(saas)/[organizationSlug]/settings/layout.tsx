import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { config } from "@repo/config";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { OrganizationLogo } from "@saas/organizations/components/OrganizationLogo";
import { SettingsMenu } from "@saas/settings/components/SettingsMenu";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { SidebarContentLayout } from "@saas/shared/components/SidebarContentLayout";
import { UserAvatar } from "@shared/components/UserAvatar";
import {
	CreditCardIcon,
	Settings2Icon,
	SettingsIcon,
	LockKeyholeIcon,
	TriangleAlertIcon,
	Users2Icon,
	BarChart3Icon,
	PaletteIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function SettingsLayout({
	children,
	params,
}: PropsWithChildren<{
	params: Promise<{ organizationSlug: string }>;
}>) {
	const t = await getTranslations();
	const session = await getSession();
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);

	if (!organization) {
		redirect("/onboarding");
	}

	if (!session) {
		redirect("/auth/login");
	}

	const userIsOrganizationAdmin = isOrganizationAdmin(
		organization,
		session.user,
	);

	const organizationSettingsBasePath = `/${organizationSlug}/settings`;

	const menuItems = [
		// Section 1: Personal/Account Settings
		{
			title: t("settings.menu.account.title"),
			avatar: (
				<UserAvatar
					name={session.user.name ?? ""}
					avatarUrl={session.user.image}
				/>
			),
			items: [
				{
					title: t("settings.menu.account.general"),
					href: `${organizationSettingsBasePath}/account/general`,
					icon: <SettingsIcon className="size-4 opacity-50" />,
				},
				{
					title: t("settings.menu.account.security"),
					href: `${organizationSettingsBasePath}/account/security`,
					icon: <LockKeyholeIcon className="size-4 opacity-50" />,
				},
				{
					title: t("settings.menu.account.dangerZone"),
					href: `${organizationSettingsBasePath}/account/danger-zone`,
					icon: <TriangleAlertIcon className="size-4 opacity-50" />,
				},
			],
		},
		// Section 2: Active Workspace Settings
		{
			title: t("settings.menu.organization.title"),
			avatar: (
				<OrganizationLogo
					name={organization.name}
					logoUrl={organization.logo}
				/>
			),
			items: [
				{
					title: t("settings.menu.organization.general"),
					href: `${organizationSettingsBasePath}/general`,
					icon: <Settings2Icon className="size-4 opacity-50" />,
				},
				{
					title: t("settings.menu.organization.members"),
					href: `${organizationSettingsBasePath}/members`,
					icon: <Users2Icon className="size-4 opacity-50" />,
				},
				{
					title: t("settings.menu.organization.usage"),
					href: `${organizationSettingsBasePath}/usage`,
					icon: <BarChart3Icon className="size-4 opacity-50" />,
				},
				...(userIsOrganizationAdmin
					? [
							{
								title: "Branding",
								href: `${organizationSettingsBasePath}/branding`,
								icon: (
									<PaletteIcon className="size-4 opacity-50" />
								),
							},
						]
					: []),
				...(config.organizations.enable &&
				config.organizations.enableBilling &&
				userIsOrganizationAdmin
					? [
							{
								title: t("settings.menu.organization.billing"),
								href: `${organizationSettingsBasePath}/billing`,
								icon: (
									<CreditCardIcon className="size-4 opacity-50" />
								),
							},
						]
					: []),
				...(userIsOrganizationAdmin
					? [
							{
								title: t(
									"settings.menu.organization.dangerZone",
								),
								href: `${organizationSettingsBasePath}/danger-zone`,
								icon: (
									<TriangleAlertIcon className="size-4 opacity-50" />
								),
							},
						]
					: []),
			],
		},
	];

	return (
		<>
			<PageHeader
				title={t("organizations.settings.title")}
				subtitle={t("organizations.settings.subtitle")}
			/>
			<SidebarContentLayout
				sidebar={<SettingsMenu menuItems={menuItems} />}
			>
				{children}
			</SidebarContentLayout>
		</>
	);
}

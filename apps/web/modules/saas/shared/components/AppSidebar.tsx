"use client";

import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@ui/components/sidebar";
import {
	FileTextIcon,
	LayoutDashboardIcon,
	MessageSquareIcon,
	ReceiptIcon,
	SettingsIcon,
	UserCogIcon,
	BuildingIcon,
	RepeatIcon,
	UsersIcon,
	BanknoteIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { NavUser } from "./NavUser";
import { PlanUsageCard } from "./PlanUsageCard";
import { SearchModal } from "./SearchModal";
import { SearchTrigger } from "./SearchTrigger";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization, isOrganizationAdmin } = useActiveOrganization();
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

	// Handle CMD+K keyboard shortcut
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.key === "k" &&
				!event.shiftKey
			) {
				event.preventDefault();
				setIsSearchModalOpen((open) => !open);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const basePath = activeOrganization
		? `/workspace/${activeOrganization.slug}`
		: "/workspace";
	const expenseAccountsPath = activeOrganization
		? `/${activeOrganization.slug}/expense-accounts`
		: "/expense-accounts";
	const expensesPath = activeOrganization
		? `/${activeOrganization.slug}/expenses`
		: "/expenses";
	const subscriptionsPath = activeOrganization
		? `/${activeOrganization.slug}/subscriptions`
		: "/subscriptions";
	const teamMembersPath = activeOrganization
		? `/${activeOrganization.slug}/team-members`
		: "/team-members";
	const loansPath = activeOrganization
		? `/${activeOrganization.slug}/loans`
		: "/loans";
	const reportsPath = activeOrganization
		? `/${activeOrganization.slug}/expenses/reports`
		: "/expenses/reports";

	const menuItems = [
		{
			label: t("app.menu.dashboard"),
			href: basePath,
			icon: LayoutDashboardIcon,
			isActive: pathname === basePath,
			hasAction: false,
		},
		...(activeOrganization
			? [
					{
						label: t("app.menu.expenseAccounts"),
						href: expenseAccountsPath,
						icon: BuildingIcon,
						isActive: pathname.includes("/expense-accounts") && !pathname.includes("/expense-accounts/"),
						hasAction: false,
					},
					{
						label: t("app.menu.expenses"),
						href: expensesPath,
						icon: ReceiptIcon,
						isActive:
							pathname === expensesPath ||
							pathname.includes("/expenses/analytics"),
						hasAction: false,
					},
					{
						label: t("app.menu.subscriptions"),
						href: subscriptionsPath,
						icon: RepeatIcon,
						isActive: pathname === subscriptionsPath,
						hasAction: false,
					},
					{
						label: t("app.menu.teamMembers"),
						href: teamMembersPath,
						icon: UsersIcon,
						isActive: pathname === teamMembersPath,
						hasAction: false,
					},
					{
						label: t("app.menu.loans"),
						href: loansPath,
						icon: BanknoteIcon,
						isActive: pathname === loansPath,
						hasAction: false,
					},
					{
						label: t("app.menu.reports"),
						href: reportsPath,
						icon: FileTextIcon,
						isActive: pathname.includes("/expenses/reports"),
						hasAction: false,
					},
				]
			: []),
		...(activeOrganization && isOrganizationAdmin
			? [
					{
						label: t("app.menu.organizationSettings"),
						href: `${basePath}/settings`,
						icon: SettingsIcon,
						isActive: pathname.startsWith(`${basePath}/settings/`),
						hasAction: false,
					},
				]
			: []),
		...(user?.role === "admin"
			? [
					{
						label: t("app.menu.admin"),
						href: "/admin",
						icon: UserCogIcon,
						isActive: pathname.startsWith("/admin"),
						hasAction: false,
					},
				]
			: []),
	];

	return (
		<Sidebar collapsible="icon" variant="inset" {...props}>
			<SidebarHeader>
				{config.organizations.enable &&
					!config.organizations.hideOrganization && (
						<>
							<WorkspaceSwitcher />
							<SearchTrigger
								onClick={() => setIsSearchModalOpen(true)}
								className="mt-2"
							/>
						</>
					)}
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton
										asChild
										isActive={item.isActive}
										tooltip={item.label}
										className="h-10! px-3! py-1.5! text-base!"
									>
										<Link href={item.href}>
											<item.icon />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							tooltip={t("app.sidebar.feedback")}
							className="h-10! px-3! py-1.5! text-base!"
						>
							<Link href="#">
								<MessageSquareIcon className="size-4" />
								<span>{t("app.sidebar.feedback")}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<NavUser />
				<PlanUsageCard />
			</SidebarFooter>
			<SidebarRail />
			<SearchModal
				open={isSearchModalOpen}
				onOpenChange={setIsSearchModalOpen}
			/>
		</Sidebar>
	);
}

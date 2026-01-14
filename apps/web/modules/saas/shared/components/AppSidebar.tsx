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
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@ui/components/sidebar";
import {
	BookOpenIcon,
	FileTextIcon,
	FolderKanbanIcon,
	LayoutDashboardIcon,
	MessageSquareIcon,
	PlusIcon,
	SettingsIcon,
	UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { NavUser } from "./NavUser";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { PlanUsageCard } from "./PlanUsageCard";
import { SearchTrigger } from "./SearchTrigger";
import { SearchModal } from "./SearchModal";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization, isOrganizationAdmin } = useActiveOrganization();
	const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
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

	const menuItems = [
		{
			label: t("app.menu.dashboard"),
			href: basePath,
			icon: LayoutDashboardIcon,
			isActive: pathname === basePath,
			hasAction: false,
		},
		{
			label: t("app.menu.projects"),
			href: `${basePath}/projects`,
			icon: FolderKanbanIcon,
			isActive: pathname.includes("/projects"),
			hasAction: true,
			onActionClick: () => setIsProjectDialogOpen(true),
		},
		...(activeOrganization
			? [
					{
						label: t("app.menu.reports"),
						href: `${basePath}/reports`,
						icon: FileTextIcon,
						isActive: pathname.includes("/reports"),
						hasAction: false,
					},
				]
			: []),
		{
			label: t("app.menu.resources"),
			href: `${basePath}/resources`,
			icon: BookOpenIcon,
			isActive: pathname.includes("/resources"),
			hasAction: false,
		},
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
									{item.hasAction && item.onActionClick && (
										<SidebarMenuAction
											onClick={item.onActionClick}
											className="top-1/2! -translate-y-1/2! right-1! w-auto! h-auto! aspect-auto! p-1.5! rounded-md! hover:bg-sidebar-accent!"
										>
											<PlusIcon className="size-4" />
										</SidebarMenuAction>
									)}
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
			<CreateProjectDialog
				open={isProjectDialogOpen}
				onOpenChange={setIsProjectDialogOpen}
			/>
			<SearchModal
				open={isSearchModalOpen}
				onOpenChange={setIsSearchModalOpen}
			/>
		</Sidebar>
	);
}

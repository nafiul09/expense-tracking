"use client";

import { NavUser } from "@saas/shared/components/NavUser";
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
import { Button } from "@ui/components/button";
import {
	LayoutDashboardIcon,
	UsersIcon,
	Building2Icon,
	ArrowLeftIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations();
	const pathname = usePathname();
	const router = useRouter();

	const handleBackToWorkspace = async () => {
		// Navigate back to workspace - will automatically go to default workspace
		router.push("/workspace");
	};

	const menuItems = [
		{
			label: t("admin.menu.dashboard"),
			href: "/admin",
			icon: LayoutDashboardIcon,
			isActive: pathname === "/admin",
		},
		{
			label: t("admin.menu.users"),
			href: "/admin/users",
			icon: UsersIcon,
			isActive: pathname.startsWith("/admin/users"),
		},
		{
			label: t("admin.menu.workspaces"),
			href: "/admin/workspaces",
			icon: Building2Icon,
			isActive: pathname.startsWith("/admin/workspaces"),
		},
	];

	return (
		<Sidebar collapsible="icon" variant="inset" {...props}>
			<SidebarHeader>
				<div className="px-0 py-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleBackToWorkspace}
						className="w-full justify-start gap-2"
					>
						<ArrowLeftIcon className="size-4" />
						<span>{t("admin.backToWorkspace")}</span>
					</Button>
				</div>
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
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

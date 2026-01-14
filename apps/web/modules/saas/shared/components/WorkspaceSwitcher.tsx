"use client";

import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { CreateOrganizationDialog } from "@saas/organizations/components/CreateOrganizationDialog";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { ActivePlanBadge } from "@saas/payments/components/ActivePlanBadge";
import { clearCache } from "@shared/lib/cache";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@ui/components/sidebar";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OrganizationLogo } from "../../organizations/components/OrganizationLogo";

export function WorkspaceSwitcher() {
	const t = useTranslations();
	const { user } = useSession();
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();
	const { isMobile } = useSidebar();
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	if (!user || !activeOrganization) {
		return null;
	}

	const currentWorkspace = {
		name: activeOrganization.name,
		logo: activeOrganization.logo,
		plan: activeOrganization,
		type: "organization" as const,
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
								<OrganizationLogo
									name={activeOrganization.name}
									logoUrl={activeOrganization.logo}
									className="size-full"
								/>
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate font-semibold">
									{currentWorkspace.name}
								</span>
								{config.organizations.enableBilling ? (
									<span className="truncate text-xs flex items-center">
										<ActivePlanBadge
											organizationId={
												activeOrganization.id
											}
										/>
									</span>
								) : null}
							</div>
							<ChevronsUpDownIcon className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							{t(
								"organizations.organizationSelect.organizations",
							)}
						</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={activeOrganization?.slug}
							onValueChange={async (organizationSlug: string) => {
								await clearCache();
								setActiveOrganization(organizationSlug);
							}}
						>
							{allOrganizations?.map((organization) => (
								<DropdownMenuRadioItem
									key={organization.slug}
									value={organization.slug}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-sm border overflow-hidden p-0.5">
										<OrganizationLogo
											className="size-full"
											name={organization.name}
											logoUrl={organization.logo}
										/>
									</div>
									{organization.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>

						{config.organizations
							.enableUsersToCreateOrganizations && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setIsDialogOpen(true)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-md border bg-background">
										<PlusIcon className="size-4" />
									</div>
									<div className="font-medium text-muted-foreground">
										{t(
											"organizations.organizationSelect.createNewOrganization",
										)}
									</div>
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
			{config.organizations.enableUsersToCreateOrganizations && (
				<CreateOrganizationDialog
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
				/>
			)}
		</SidebarMenu>
	);
}

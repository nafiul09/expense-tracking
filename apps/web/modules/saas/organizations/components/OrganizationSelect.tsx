"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { CreateOrganizationDialog } from "@saas/organizations/components/CreateOrganizationDialog";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { ActivePlanBadge } from "@saas/payments/components/ActivePlanBadge";
import { UserAvatar } from "@shared/components/UserAvatar";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OrganizationLogo } from "./OrganizationLogo";

export function OrganzationSelect({ className }: { className?: string }) {
	const t = useTranslations();
	const { user } = useSession();
	const router = useRouter();
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	if (!user) {
		return null;
	}

	return (
		<div className={className}>
			<DropdownMenu>
				<DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left outline-none focus-visible:bg-primary/10 focus-visible:ring-none">
					<div className="flex flex-1 items-center justify-start gap-2 text-sm overflow-hidden">
						{activeOrganization ? (
							<>
								<div className="hidden size-6 items-center justify-center p-0.5 sm:flex">
									<OrganizationLogo
										name={activeOrganization.name}
										logoUrl={activeOrganization.logo}
										className="size-full"
									/>
								</div>
								<span className="block flex-1 truncate">
									{activeOrganization.name}
								</span>
								{config.organizations.enableBilling && (
									<ActivePlanBadge
										organizationId={activeOrganization.id}
									/>
								)}
							</>
						) : (
							<>
								<div className="hidden size-6 items-center justify-center p-0.5 sm:flex">
									<UserAvatar
										className="size-full"
										name={user.name ?? ""}
										avatarUrl={user.image}
									/>
								</div>
								<span className="block truncate">
									{t(
										"organizations.organizationSelect.personalAccount",
									)}
								</span>
								{config.users.enableBilling && (
									<ActivePlanBadge />
								)}
							</>
						)}
					</div>

					<ChevronsUpDownIcon className="block size-4 opacity-50" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-full">
					{!config.organizations.requireOrganization && (
						<>
							<DropdownMenuRadioGroup
								value={activeOrganization?.id ?? user.id}
								onValueChange={async (value: string) => {
									if (value === user.id) {
										await clearCache();
										router.replace("/app");
									}
								}}
							>
								<DropdownMenuLabel className="text-foreground/60 text-xs">
									{t(
										"organizations.organizationSelect.personalAccount",
									)}
								</DropdownMenuLabel>
								<DropdownMenuRadioItem
									value={user.id}
									className="flex cursor-pointer items-center justify-center gap-2 pl-3"
								>
									<div className="flex flex-1 items-center justify-start gap-2">
										<div className="flex size-8 items-center justify-center p-1">
											<UserAvatar
												className="size-full"
												name={user.name ?? ""}
												avatarUrl={user.image}
											/>
										</div>
										{user.name}
									</div>
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuRadioGroup
						value={activeOrganization?.slug}
						onValueChange={async (organizationSlug: string) => {
							await clearCache();
							setActiveOrganization(organizationSlug);
						}}
					>
						<DropdownMenuLabel className="text-foreground/60 text-xs">
							{t(
								"organizations.organizationSelect.organizations",
							)}
						</DropdownMenuLabel>
						{allOrganizations?.map((organization) => (
							<DropdownMenuRadioItem
								key={organization.slug}
								value={organization.slug}
								className="flex cursor-pointer items-center justify-center gap-2 pl-3"
							>
								<div className="flex flex-1 items-center justify-start gap-2">
									<div className="flex size-8 items-center justify-center p-1">
										<OrganizationLogo
											className="size-full"
											name={organization.name}
											logoUrl={organization.logo}
										/>
									</div>
									{organization.name}
								</div>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>

					{config.organizations.enableUsersToCreateOrganizations && (
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => setIsDialogOpen(true)}
								className="text-primary! cursor-pointer text-sm"
							>
								<PlusIcon className="mr-2 size-6 rounded-md bg-primary/20 p-1" />
								{t(
									"organizations.organizationSelect.createNewOrganization",
								)}
							</DropdownMenuItem>
						</DropdownMenuGroup>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{config.organizations.enableUsersToCreateOrganizations && (
				<CreateOrganizationDialog
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
				/>
			)}
		</div>
	);
}

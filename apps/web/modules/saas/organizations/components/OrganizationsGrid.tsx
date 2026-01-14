"use client";

import { config } from "@repo/config";
import { OrganizationLogo } from "@saas/organizations/components/OrganizationLogo";
import { CreateOrganizationDialog } from "@saas/organizations/components/CreateOrganizationDialog";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { Card } from "@ui/components/card";
import { ShimmerButton } from "@ui/components/shimmer-button";
import { ChevronRightIcon, PlusCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function OrganizationsGrid() {
	const t = useTranslations();
	const { setActiveOrganization } = useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	return (
		<div className="@container">
			<h2 className="mb-2 font-semibold text-lg">
				{t("organizations.organizationsGrid.title")}
			</h2>
			<div className="grid @2xl:grid-cols-3 @lg:grid-cols-2 grid-cols-1 gap-4">
				{allOrganizations?.map((organization) => (
					<Card
						key={organization.id}
						className="flex cursor-pointer items-center gap-2 overflow-hidden p-4"
						onClick={() => setActiveOrganization(organization.slug)}
					>
						<div className="flex size-16 items-center justify-center p-2">
							<OrganizationLogo
								name={organization.name}
								logoUrl={organization.logo}
								className="size-full"
							/>
						</div>
						<span className="flex items-center gap-1 text-base leading-tight">
							<span className="block font-medium">
								{organization.name}
							</span>
							<ChevronRightIcon className="size-4" />
						</span>
					</Card>
				))}

				{config.organizations.enableUsersToCreateOrganizations && (
					<ShimmerButton
						type="button"
						onClick={() => setIsDialogOpen(true)}
						className="h-full w-full rounded-2xl"
						innerClassName="rounded-2xl px-6 py-4 text-base"
					>
						<PlusCircleIcon className="size-5" />
						{t(
							"organizations.organizationsGrid.createNewOrganization",
						)}
					</ShimmerButton>
				)}
			</div>
			{config.organizations.enableUsersToCreateOrganizations && (
				<CreateOrganizationDialog
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
				/>
			)}
		</div>
	);
}

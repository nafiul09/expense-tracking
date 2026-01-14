import { config } from "@repo/config";
import {
	getActiveOrganization,
	getOrganizationList,
	getSession,
} from "@saas/auth/lib/server";
import { activeOrganizationQueryKey } from "@saas/organizations/lib/api";
import { AppWrapper } from "@saas/shared/components/AppWrapper";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function OrganizationLayout({
	children,
	params,
}: PropsWithChildren<{
	params: Promise<{
		organizationSlug: string;
	}>;
}>) {
	const { organizationSlug } = await params;
	const session = await getSession();

	// Keep this check for direct URL access (bypassing parent layout)
	if (!session) {
		redirect("/auth/login");
	}

	try {
		const organization = await getActiveOrganization(organizationSlug);

		if (!organization) {
			const organizations = await getOrganizationList();
			const defaultOrganization =
				organizations.find(
					(org) => org.id === session?.session.activeOrganizationId,
				) || organizations[0];

			if (defaultOrganization) {
				redirect(`/${defaultOrganization.slug}`);
			} else {
				redirect("/onboarding");
			}
		}

		const queryClient = getServerQueryClient();

		// Prefetch organization-specific data
		await Promise.all([
			queryClient.prefetchQuery({
				queryKey: activeOrganizationQueryKey(organizationSlug),
				queryFn: () => organization,
				staleTime: 60 * 1000,
			}),

			config.users.enableBilling &&
				queryClient.prefetchQuery(
					orpc.payments.listPurchases.queryOptions({
						input: {
							organizationId: organization.id,
						},
					}),
				),
		]);

		return <AppWrapper>{children}</AppWrapper>;
	} catch (error) {
		console.error("Organization layout error:", error);
		redirect("/onboarding");
	}
}

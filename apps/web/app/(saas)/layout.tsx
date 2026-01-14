import { config } from "@repo/config";
import { SessionProvider } from "@saas/auth/components/SessionProvider";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { ActiveOrganizationProvider } from "@saas/organizations/components/ActiveOrganizationProvider";
import { organizationListQueryKey } from "@saas/organizations/lib/api";
import { ConfirmationAlertProvider } from "@saas/shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function SaaSLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	// Keep server-side redirect for direct URL access
	if (!session) {
		redirect("/auth/login");
	}

	const queryClient = getServerQueryClient();

	// Prefetch data for faster client-side hydration
	await Promise.all([
		queryClient.prefetchQuery({
			queryKey: sessionQueryKey,
			queryFn: () => session,
			staleTime: 5 * 60 * 1000, // Match client config
		}),

		config.organizations.enable &&
			queryClient.prefetchQuery({
				queryKey: organizationListQueryKey,
				queryFn: getOrganizationList,
				staleTime: 60 * 1000, // 1 minute
			}),

		config.users.enableBilling &&
			queryClient.prefetchQuery(
				orpc.payments.listPurchases.queryOptions({
					input: {},
				}),
			),
	]);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionProvider>
				<ActiveOrganizationProvider>
					<ConfirmationAlertProvider>
						{children}
					</ConfirmationAlertProvider>
				</ActiveOrganizationProvider>
			</SessionProvider>
		</HydrationBoundary>
	);
}

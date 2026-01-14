"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { FullScreenLoader } from "@shared/components/FullScreenLoader";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function RootPage() {
	const { user, loaded, appInitialized } = useSession();
	const router = useRouter();
	const hasRedirected = useRef(false);

	// Only fetch orgs if user exists and hasn't redirected yet
	const { data: organizations, isLoading: isLoadingOrgs } =
		useOrganizationListQuery({
			enabled: !!user && !hasRedirected.current,
		});

	useEffect(() => {
		if (!loaded || hasRedirected.current) {
			return;
		}

		// Not authenticated - redirect to login
		if (!user) {
			hasRedirected.current = true;
			router.replace("/auth/login");
			return;
		}

		// Wait for organizations to load
		if (isLoadingOrgs || !organizations) {
			return;
		}

		// Redirect to workspace
		hasRedirected.current = true;
		const firstOrg = organizations[0];

		if (firstOrg) {
			router.replace(`/${firstOrg.slug}`);
		} else {
			router.replace("/onboarding");
		}
	}, [user, loaded, organizations, isLoadingOrgs, router]);

	// Show full screen loader throughout the entire initial loading process
	// This includes: checking auth, loading organizations, and redirecting
	// After app is initialized, subsequent navigation uses top progress bar
	if (!appInitialized) {
		return <FullScreenLoader />;
	}

	// After app initialized, don't show any loader - let top progress bar handle it
	// This component will quickly redirect, so minimal content is fine
	return null;
}

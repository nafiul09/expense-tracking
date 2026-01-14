import { config } from "@repo/config";
import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";

export default async function WorkspaceIndexPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// Check onboarding status first - redirect immediately if not complete
	if (config.users.enableOnboarding && !session.user.onboardingComplete) {
		redirect("/onboarding");
	}

	const organizations = await getOrganizationList();

	// If no workspaces and onboarding is complete, still send to onboarding to create first workspace
	if (organizations.length === 0) {
		redirect("/onboarding");
	}

	// Find user's default workspace (active org or first org)
	const defaultOrganization =
		organizations.find(
			(org) => org.id === session?.session.activeOrganizationId,
		) || organizations[0];

	// Redirect to the default workspace
	redirect(`/${defaultOrganization.slug}`);
}

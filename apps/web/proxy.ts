import { config as appConfig } from "@repo/config";
import { db } from "@repo/database";
import { getPurchasesByOrganizationId } from "@repo/database";
import { createPurchasesHelper } from "@repo/payments";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { withQuery } from "ufo";
import { getBaseUrl } from "@repo/utils";

// Helper function to check custom domain access based on plan
async function checkCustomDomainPlanAccess(
	organizationId: string,
): Promise<boolean> {
	try {
		const purchases = await getPurchasesByOrganizationId(organizationId);

		// Create helper to determine active plan
		const { activePlan } = createPurchasesHelper(purchases);

		if (!activePlan) {
			// No active purchase - check free plan limits
			const freePlan = appConfig.payments.plans.free;
			const limitValue = freePlan.limits?.customDomain;

			// Boolean limits: true = enabled, false = disabled
			if (typeof limitValue === "boolean") {
				return limitValue;
			}

			return false;
		}

		// Find the plan configuration
		const planConfig = appConfig.payments.plans[activePlan.id];

		if (!planConfig?.limits) {
			return false;
		}

		const limitValue = planConfig.limits.customDomain;

		// Boolean limits: true = enabled, false = disabled
		if (typeof limitValue === "boolean") {
			return limitValue;
		}

		return false;
	} catch {
		return false;
	}
}

export default async function proxy(req: NextRequest) {
	const { pathname, origin, hostname } = req.nextUrl;
	const sessionCookie = getSessionCookie(req);
	const baseUrl = getBaseUrl();

	// 1. Custom Domain Handling (Highest Priority)
	// Check if the incoming request is on a custom domain
	if (hostname !== new URL(baseUrl).hostname) {
		const organization = await db.organization.findFirst({
			where: {
				customDomain: hostname,
				customDomainEnabled: true,
				domainVerifiedAt: { not: null },
			},
		});

		if (organization) {
			// Check if organization has plan access to custom domains
			const hasAccess = await checkCustomDomainPlanAccess(
				organization.id,
			);

			if (hasAccess) {
				// Rewrite to the organization's slug route
				return NextResponse.rewrite(
					new URL(`/${organization.slug}${pathname}`, req.url),
				);
			}
		}

		// If custom domain is not found, not active, or plan doesn't have access
		// redirect to main app URL
		return NextResponse.redirect(
			new URL(req.url.replace(hostname, new URL(baseUrl).hostname)),
		);
	}

	// 2. Legacy /workspace redirects (after custom domain check)
	if (pathname.startsWith("/workspace")) {
		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		if (!sessionCookie) {
			return NextResponse.redirect(
				new URL(
					withQuery("/auth/login", {
						redirectTo: pathname,
					}),
					origin,
				),
			);
		}

		// Redirect /workspace to /
		return NextResponse.redirect(
			new URL(pathname.replace("/workspace", ""), origin),
		);
	}

	// 3. Admin routes
	if (pathname.startsWith("/admin")) {
		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		if (!sessionCookie) {
			return NextResponse.redirect(
				new URL(
					withQuery("/auth/login", {
						redirectTo: pathname,
					}),
					origin,
				),
			);
		}

		return NextResponse.next();
	}

	// 4. Auth routes
	if (pathname.startsWith("/auth")) {
		if (!appConfig.ui.saas.enabled) {
			return NextResponse.redirect(new URL("/", origin));
		}

		return NextResponse.next();
	}

	// 5. Paths without locale
	const pathsWithoutLocale = [
		"/onboarding",
		"/choose-plan",
		"/organization-invitation",
		"/admin", // Admin routes are handled separately for auth
	];

	if (pathsWithoutLocale.some((path) => pathname.startsWith(path))) {
		return NextResponse.next();
	}

	// 6. Organization routes (new workspace structure)
	// Allow root path and organization-specific routes to pass through
	// Root path handles its own auth/redirect logic
	const pathsToAllowThrough = ["/"];

	if (pathsToAllowThrough.includes(pathname)) {
		return NextResponse.next();
	}

	// Allow organization slug routes (anything not starting with reserved paths)
	const reservedPaths = [
		"/api",
		"/auth",
		"/admin",
		"/onboarding",
		"/choose-plan",
		"/organization-invitation",
		"/image-proxy",
		"/images",
		"/fonts",
	];
	const isReservedPath = reservedPaths.some((path) =>
		pathname.startsWith(path),
	);

	if (!isReservedPath && pathname !== "/") {
		// This is likely an organization route like /{slug} or /{slug}/settings
		return NextResponse.next();
	}

	// 7. For root path and other non-reserved paths, let them through
	// The root page handles its own authentication and redirects
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|image-proxy|images|fonts|_next/static|_next/image|favicon.ico|icon.png|sitemap.xml|robots.txt).*)",
	],
};

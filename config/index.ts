import type { Config } from "./types";

export const config = {
	appName: "WebClarity",
	// Internationalization
	i18n: {
		// Whether internationalization should be enabled (if disabled, you still need to define the locale you want to use below and set it as the default locale)
		enabled: true,
		// Define all locales here that should be available in the app
		// You need to define a label that is shown in the language selector and a currency that should be used for pricing with this locale
		locales: {
			en: {
				currency: "USD",
				label: "English",
			},
			de: {
				currency: "USD",
				label: "Deutsch",
			},
		},
		// The default locale is used if no locale is provided
		defaultLocale: "en",
		// The default currency is used for pricing if no currency is provided
		defaultCurrency: "USD",
		// The name of the cookie that is used to determine the locale
		localeCookieName: "NEXT_LOCALE",
	},
	// Organizations
	organizations: {
		// Whether organizations are enabled in general
		enable: true,
		// Whether billing for organizations should be enabled (below you can enable it for users instead)
		enableBilling: true,
		// Whether the organization should be hidden from the user (use this for multi-tenant applications)
		hideOrganization: false,
		// Should users be able to create new organizations? Otherwise only admin users can create them
		enableUsersToCreateOrganizations: true,
		// Whether users should be required to be in an organization. This will redirect users to the organization page after sign in
		requireOrganization: true,
		// Define forbidden organization slugs. Make sure to add all paths that you define as a route after /app/... to avoid routing issues
		forbiddenOrganizationSlugs: [
			"new-organization",
			"admin",
			"settings",
			"ai-demo",
			"organization-invitation",
			"auth",
			"api",
			"image-proxy",
			"onboarding",
			"choose-plan",
		],
	},
	// Users
	users: {
		// Whether billing should be enabled for users (above you can enable it for organizations instead)
		enableBilling: false,
		// Whether you want the user to go through an onboarding form after signup (can be defined in the OnboardingForm.tsx)
		enableOnboarding: true,
	},
	// Authentication
	auth: {
		// Whether users should be able to create accounts (otherwise users can only be by admins)
		enableSignup: true,
		// Whether users should be able to sign in with a magic link
		enableMagicLink: false, // ❌ DISABLED - Not using magic links
		// Whether users should be able to sign in with a social provider
		enableSocialLogin: false, // ✅ ENABLED - Google OAuth only
		// Whether users should be able to sign in with a passkey
		enablePasskeys: false, // ❌ DISABLED - Not using passkeys
		// Whether users should be able to sign in with a password
		enablePasswordLogin: true, // ✅ ENABLED - Email/password auth
		// Whether users should be activate two factor authentication
		enableTwoFactor: true, // ✅ ENABLED - 2FA for security
		// where users should be redirected after the sign in
		redirectAfterSignIn: "/",
		// where users should be redirected after logout
		redirectAfterLogout: "/auth/login",
		// how long a session should be valid
		sessionCookieMaxAge: 60 * 60 * 24 * 30,
	},
	// Mails
	mails: {
		// the from address for mails
		from: "notification@webclarity.ai",
	},
	// Frontend
	ui: {
		// the themes that should be available in the app
		enabledThemes: ["light", "dark"],
		// the default theme (use "system" to respect user's device preferences)
		defaultTheme: "system",
		// the saas part of the application
		saas: {
			// whether the saas part should be enabled
			enabled: true,
			// whether the sidebar layout should be used
			useSidebarLayout: true,
		},
		// the marketing part of the application - REMOVED for SaaS-only deployment
		marketing: {
			enabled: false,
		},
	},
	// Storage
	storage: {
		// define the name of the buckets for the different types of files
		bucketNames: {
			avatars: process.env.NEXT_PUBLIC_AVATARS_BUCKET_NAME ?? "avatars",
		},
	},
	// Payments
	payments: {
		// define the products that should be available in the checkout
		plans: {
			// The free plan is treated differently. It will automatically be assigned if the user has no other plan.
			free: {
				isFree: true,
				limits: {
					customDomain: true, // ❌ No custom domain
					// Future: projects, aiAnalyses, etc.
				},
			},
			pro: {
				recommended: true,
				limits: {
					customDomain: true, // ✅ Custom domain enabled
				},
				prices: [
					{
						type: "recurring",
						productId: process.env
							.NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY as string,
						interval: "month",
						amount: 29,
						currency: "USD",
						seatBased: true,
						trialPeriodDays: 7,
					},
					{
						type: "recurring",
						productId: process.env
							.NEXT_PUBLIC_PRICE_ID_PRO_YEARLY as string,
						interval: "year",
						amount: 290,
						currency: "USD",
						seatBased: true,
						trialPeriodDays: 7,
					},
				],
			},
			lifetime: {
				limits: {
					customDomain: true, // ✅ Custom domain enabled
				},
				prices: [
					{
						type: "one-time",
						productId: process.env
							.NEXT_PUBLIC_PRICE_ID_LIFETIME as string,
						amount: 799,
						currency: "USD",
					},
				],
			},
			enterprise: {
				isEnterprise: true,
				limits: {
					customDomain: true, // ✅ Custom domain enabled
				},
			},
		},
	},
} as const satisfies Config;

export type { Config };

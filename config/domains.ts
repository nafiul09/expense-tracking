export const domainConfig = {
	// CNAME target that users will point their domains to
	cnameTarget: process.env.NEXT_PUBLIC_CNAME_TARGET || "cname.webclarity.ai",

	// Default domain for the app
	defaultDomain:
		process.env.NEXT_PUBLIC_APP_URL || "https://app.webclarity.ai",

	// Forbidden custom domains
	forbiddenDomains: ["webclarity.ai", "app.webclarity.ai", "localhost"],
} as const;

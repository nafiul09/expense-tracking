import "server-only";

import { config } from "@repo/config";
import type { Locale } from "@repo/i18n";
import { cookies } from "next/headers";

export async function getUserLocale() {
	try {
		const cookie = (await cookies()).get(config.i18n.localeCookieName);
		return cookie?.value ?? config.i18n.defaultLocale;
	} catch (error) {
		// If cookies() fails (e.g., in static generation or edge runtime),
		// return default locale
		console.warn("Failed to read locale cookie:", error);
		return config.i18n.defaultLocale;
	}
}

export async function setLocaleCookie(locale: Locale) {
	try {
		(await cookies()).set(config.i18n.localeCookieName, locale);
	} catch (error) {
		// If cookies() fails (e.g., in static generation or edge runtime),
		// silently fail - locale will be set on next request
		console.warn("Failed to set locale cookie:", error);
	}
}

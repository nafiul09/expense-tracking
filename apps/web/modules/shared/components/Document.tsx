import { ClientProviders } from "@shared/components/ClientProviders";
import { ConsentProvider } from "@shared/components/ConsentProvider";
import { cn } from "@ui/lib";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

const sansFont = Inter({
	weight: ["400", "500", "600", "700"],
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

export async function Document({
	children,
	locale,
}: PropsWithChildren<{ locale: string }>) {
	let initialConsent = false;
	try {
		const cookieStore = await cookies();
		const consentCookie = cookieStore.get("consent");
		initialConsent = consentCookie?.value === "true";
	} catch (error) {
		// If cookies() fails (e.g., in static generation or edge runtime),
		// default to false - user will see the consent banner
		console.warn("Failed to read consent cookie:", error);
	}

	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={sansFont.className}
		>
			<body
				className={cn(
					"min-h-screen bg-background text-foreground antialiased",
				)}
				suppressHydrationWarning
			>
				<NuqsAdapter>
					<ConsentProvider initialConsent={initialConsent}>
						<ClientProviders>{children}</ClientProviders>
					</ConsentProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}

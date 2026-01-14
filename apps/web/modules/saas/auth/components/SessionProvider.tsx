"use client";
import { authClient } from "@repo/auth/client";
import { sessionQueryKey, useSessionQuery } from "@saas/auth/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SessionContext } from "../lib/session-context";

export function SessionProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();

	const { data: session, isLoading, isFetched } = useSessionQuery();

	// Track initial app load (persisted in sessionStorage)
	// Always start with false to avoid hydration mismatch
	const [appInitialized, setAppInitialized] = useState(false);
	const [loaded, setLoaded] = useState(false);

	// Track previous user ID to detect session changes (using ref to avoid infinite loops)
	const previousUserIdRef = useRef<string | undefined>(undefined);
	const hasInitializedRef = useRef(false);

	// Sync appInitialized from sessionStorage on mount (client-side only)
	useEffect(() => {
		if (typeof window !== "undefined") {
			const initialized =
				sessionStorage.getItem("app_initialized") === "true";
			setAppInitialized(initialized);
		}
	}, []);

	useEffect(() => {
		// Mark as loaded when query completes (regardless of session presence)
		if (isFetched && !isLoading) {
			setLoaded(true);
		}
	}, [isFetched, isLoading]);

	// Detect session changes (login/logout/impersonation)
	useEffect(() => {
		const currentUserId = session?.user?.id;

		// On first mount, store the current user ID
		if (!hasInitializedRef.current) {
			previousUserIdRef.current = currentUserId;
			hasInitializedRef.current = true;
			return;
		}

		// If user ID changed (login, logout, or impersonation), reset everything
		if (currentUserId !== previousUserIdRef.current) {
			// Clear initialization flag to trigger full reload flow
			sessionStorage.removeItem("app_initialized");
			setAppInitialized(false);
			previousUserIdRef.current = currentUserId;
		}
	}, [session?.user?.id]);

	// Sync appInitialized from sessionStorage (set by AppWrapper when workspace loads)
	useEffect(() => {
		const checkInitialized = () => {
			const initialized =
				sessionStorage.getItem("app_initialized") === "true";
			if (initialized !== appInitialized) {
				setAppInitialized(initialized);
			}
		};

		// Check on mount and listen for storage changes
		checkInitialized();
		window.addEventListener("storage", checkInitialized);

		// Also check periodically (in case same-tab update)
		const interval = setInterval(checkInitialized, 100);

		return () => {
			window.removeEventListener("storage", checkInitialized);
			clearInterval(interval);
		};
	}, [appInitialized]);

	return (
		<SessionContext.Provider
			value={{
				loaded,
				appInitialized,
				session: session?.session ?? null,
				user: session?.user ?? null,
				reloadSession: async () => {
					try {
						const { data: newSession, error } =
							await authClient.getSession({
								query: {
									disableCookieCache: true,
								},
							});

						if (error) {
							throw new Error(
								error.message || "Failed to fetch session",
							);
						}

						queryClient.setQueryData(
							sessionQueryKey,
							() => newSession,
						);
					} catch (error) {
						console.error("Session reload failed:", error);
						throw error;
					}
				},
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}

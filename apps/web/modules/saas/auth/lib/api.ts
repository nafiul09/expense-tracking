import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { useQuery } from "@tanstack/react-query";

export const sessionQueryKey = ["user", "session"] as const;

export const useSessionQuery = () => {
	return useQuery({
		queryKey: sessionQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.getSession({
				query: {
					disableCookieCache: true,
				},
			});

			if (error) {
				throw new Error(error.message || "Failed to fetch session");
			}

			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes instead of infinite
		gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
		refetchOnWindowFocus: true, // Revalidate on focus
		refetchOnReconnect: true, // Revalidate on reconnect
		retry: (failureCount, error) => {
			// Retry up to 2 times, but not for auth errors
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (errorMessage.includes("401") || errorMessage.includes("403")) {
				return false;
			}
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
		enabled: config.ui.saas.enabled,
	});
};

export const userAccountQueryKey = ["user", "accounts"] as const;
export const useUserAccountsQuery = () => {
	return useQuery({
		queryKey: userAccountQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.listAccounts();

			if (error) {
				throw error;
			}

			return data;
		},
	});
};

export const userPasskeyQueryKey = ["user", "passkeys"] as const;
export const useUserPasskeysQuery = () => {
	return useQuery({
		queryKey: userPasskeyQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.passkey.listUserPasskeys();

			if (error) {
				throw error;
			}

			return data;
		},
	});
};

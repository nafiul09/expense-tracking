import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 minute default
				gcTime: 5 * 60 * 1000, // 5 minutes
				refetchOnWindowFocus: false,
				refetchOnReconnect: true,
				retry: (failureCount, error: any) => {
					// Don't retry on auth errors
					if (error?.status === 401 || error?.status === 403) {
						return false;
					}
					return failureCount < 2;
				},
				retryDelay: (attemptIndex) =>
					Math.min(1000 * 2 ** attemptIndex, 3000),
			},
			mutations: {
				retry: false,
			},
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
		},
	});
}

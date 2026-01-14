import type { OrganizationMetadata } from "@repo/auth";
import { authClient } from "@repo/auth/client";
import { orpcClient } from "@shared/lib/orpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";

export const organizationListQueryKey = ["user", "organizations"] as const;
export const useOrganizationListQuery = (options?: { enabled?: boolean }) => {
	return useQuery({
		queryKey: organizationListQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.organization.list();

			if (error) {
				throw new Error(
					error.message || "Failed to fetch organizations",
				);
			}

			return data;
		},
		staleTime: 2 * 60 * 1000, // 2 minutes (organizations don't change often)
		gcTime: 10 * 60 * 1000, // 10 minutes
		enabled: options?.enabled,
	});
};

export const activeOrganizationQueryKey = (slug: string) =>
	["user", "activeOrganization", slug] as const;
export const useActiveOrganizationQuery = (
	slug: string,
	options?: {
		enabled?: boolean;
		retry?: number;
	},
) => {
	return useQuery({
		queryKey: activeOrganizationQueryKey(slug),
		queryFn: async () => {
			const { data, error } =
				await authClient.organization.getFullOrganization({
					query: {
						organizationSlug: slug,
					},
				});

			if (error) {
				throw new Error(
					error.message || "Failed to fetch active organization",
				);
			}

			return data;
		},
		enabled: options?.enabled,
		retry: options?.retry ?? 1, // Retry once on failure by default
	});
};

export const fullOrganizationQueryKey = (id: string) =>
	["fullOrganization", id] as const;
export const useFullOrganizationQuery = (id: string) => {
	return useQuery({
		queryKey: fullOrganizationQueryKey(id),
		queryFn: async () => {
			const { data, error } =
				await authClient.organization.getFullOrganization({
					query: {
						organizationId: id,
					},
				});

			if (error) {
				throw new Error(
					error.message || "Failed to fetch full organization",
				);
			}

			return data;
		},
	});
};

/*
 * Create organization
 */
export const createOrganizationMutationKey = ["create-organization"] as const;
export const useCreateOrganizationMutation = () => {
	return useMutation({
		mutationKey: createOrganizationMutationKey,
		mutationFn: async ({
			name,
			metadata,
		}: {
			name: string;
			metadata?: OrganizationMetadata;
		}) => {
			const { slug } = await orpcClient.organizations.generateSlug({});

			const { error, data } = await authClient.organization.create({
				name,
				slug,
				metadata,
			});

			if (error) {
				throw error;
			}

			return data;
		},
	});
};

/*
 * Update organization
 */
export const updateOrganizationMutationKey = ["update-organization"] as const;
export const useUpdateOrganizationMutation = () => {
	return useMutation({
		mutationKey: updateOrganizationMutationKey,
		mutationFn: async ({
			id,
			name,
			metadata,
			updateSlug,
		}: {
			id: string;
			name: string;
			metadata?: OrganizationMetadata;
			updateSlug?: boolean;
		}) => {
			const slug = updateSlug
				? (await orpcClient.organizations.generateSlug({})).slug
				: undefined;

			const { error, data } = await authClient.organization.update({
				organizationId: id,
				data: {
					name,
					slug,
					metadata,
				},
			});

			if (error) {
				throw error;
			}

			return data;
		},
	});
};

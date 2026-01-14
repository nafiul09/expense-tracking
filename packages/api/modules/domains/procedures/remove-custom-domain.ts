import { ORPCError } from "@orpc/server";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { removeCustomDomainSchema } from "../schema";
import { VercelDomainService } from "../services/vercel-domain.service";

export const removeCustomDomain = protectedProcedure
	.route({
		method: "POST",
		path: "/domains/remove",
		tags: ["Domains"],
		summary: "Remove custom domain",
		description: "Remove a custom domain from an organization",
	})
	.input(removeCustomDomainSchema)
	.handler(async ({ context: { user }, input: { organizationId } }) => {
		// Verify organization exists
		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST");
		}

		// Verify user is admin/owner
		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership || !["owner", "admin"].includes(membership.role)) {
			throw new ORPCError("BAD_REQUEST");
		}

		if (!organization.customDomain) {
			throw new ORPCError("BAD_REQUEST");
		}

		// Check if Vercel credentials are configured
		if (!process.env.VERCEL_AUTH_TOKEN || !process.env.VERCEL_PROJECT_ID) {
			logger.error("Vercel credentials not configured");
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}

		// Initialize Vercel service
		const vercelService = new VercelDomainService({
			projectId: process.env.VERCEL_PROJECT_ID,
			authToken: process.env.VERCEL_AUTH_TOKEN,
			teamId: process.env.VERCEL_TEAM_ID,
		});

		try {
			// Remove domain from Vercel
			await vercelService.removeDomain(organization.customDomain);

			// Clear domain from organization
			await updateOrganization({
				id: organizationId,
				customDomain: null,
				customDomainEnabled: false,
				domainConfiguredAt: null,
				domainVerifiedAt: null,
			});

			return {
				success: true,
			};
		} catch (error) {
			logger.error("Failed to remove custom domain:", error);
			// Even if Vercel removal fails, clear from database
			await updateOrganization({
				id: organizationId,
				customDomain: null,
				customDomainEnabled: false,
				domainConfiguredAt: null,
				domainVerifiedAt: null,
			});

			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

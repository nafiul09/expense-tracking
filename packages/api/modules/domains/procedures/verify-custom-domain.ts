import { ORPCError } from "@orpc/server";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { verifyCustomDomainSchema } from "../schema";
import { VercelDomainService } from "../services/vercel-domain.service";

export const verifyCustomDomain = protectedProcedure
	.route({
		method: "POST",
		path: "/domains/verify",
		tags: ["Domains"],
		summary: "Verify custom domain",
		description: "Verify that custom domain DNS is properly configured",
	})
	.input(verifyCustomDomainSchema)
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
			// Verify domain
			const verification = await vercelService.verifyDomain(
				organization.customDomain,
			);

			// Update verification timestamp only if actually verified
			if (verification.verified) {
				await updateOrganization({
					id: organizationId,
					domainVerifiedAt: new Date(),
				});
			}

			// Get configuration details
			const configuration = await vercelService.checkConfiguration(
				organization.customDomain,
			);

			return {
				verified: verification.verified,
				configuration: {
					configured: configuration.configured,
					cnameRecord: configuration.cnameRecord,
					txtRecords: configuration.txtRecords,
					verification: configuration.verification,
				},
			};
		} catch (error) {
			logger.error("Failed to verify custom domain:", error);

			// More specific error message
			if (error instanceof Error) {
				if (error.message.includes("404")) {
					throw new ORPCError("NOT_FOUND");
				}
				if (
					error.message.includes("401") ||
					error.message.includes("403")
				) {
					throw new ORPCError("UNAUTHORIZED");
				}
			}

			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});

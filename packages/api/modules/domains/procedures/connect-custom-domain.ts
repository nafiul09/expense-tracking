import { ORPCError } from "@orpc/server";
import { domainConfig } from "@repo/config/domains";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { db } from "@repo/database/prisma/client";
import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { checkPlanLimit } from "../../organizations/lib/plan-limits";
import { connectCustomDomainSchema } from "../schema";
import { VercelDomainService } from "../services/vercel-domain.service";

export const connectCustomDomain = protectedProcedure
	.route({
		method: "POST",
		path: "/domains/connect",
		tags: ["Domains"],
		summary: "Connect custom domain",
		description: "Connect a custom domain to an organization",
	})
	.input(connectCustomDomainSchema)
	.handler(
		async ({ context: { user }, input: { organizationId, domain } }) => {
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
				throw new ORPCError("FORBIDDEN");
			}

			// Check if user has plan access
			const hasAccess = await checkPlanLimit(
				organizationId,
				"customDomain",
			);

			if (!hasAccess) {
				throw new ORPCError("FORBIDDEN");
			}

			// Validate domain format
			const normalizedDomain = domain.toLowerCase().trim();

			// Check forbidden domains
			if (
				domainConfig.forbiddenDomains.some((forbidden) =>
					normalizedDomain.includes(forbidden),
				)
			) {
				throw new ORPCError("BAD_REQUEST");
			}

			// Check if domain is already in use by another organization
			const existingOrgWithDomain = await db.organization.findFirst({
				where: {
					customDomain: normalizedDomain,
					id: { not: organizationId },
				},
			});

			if (existingOrgWithDomain) {
				throw new ORPCError("BAD_REQUEST");
			}

			// Check if Vercel credentials are configured
			if (
				!process.env.VERCEL_AUTH_TOKEN ||
				!process.env.VERCEL_PROJECT_ID
			) {
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
				// Add domain to Vercel
				const result = await vercelService.addDomain(normalizedDomain);

				// Update organization with domain
				await updateOrganization({
					id: organizationId,
					customDomain: normalizedDomain,
					customDomainEnabled: false, // Start disabled until verified
					domainConfiguredAt: new Date(),
				});

				return {
					success: true,
					domain: normalizedDomain,
					verified: result.configured,
					verification: result.verification,
					cnameTarget: domainConfig.cnameTarget,
				};
			} catch (error) {
				logger.error("Failed to connect custom domain:", error);
				throw new ORPCError("INTERNAL_SERVER_ERROR");
			}
		},
	);

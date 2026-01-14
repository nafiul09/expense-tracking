import { ORPCError } from "@orpc/server";
import { getOrganizationById, updateOrganization } from "@repo/database";
import { logger } from "@repo/logs";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { checkPlanLimit } from "../../organizations/lib/plan-limits";
import { toggleCustomDomainSchema } from "../schema";
import { VercelDomainService } from "../services/vercel-domain.service";

export const toggleCustomDomain = protectedProcedure
	.route({
		method: "POST",
		path: "/domains/toggle",
		tags: ["Domains"],
		summary: "Toggle custom domain",
		description: "Enable or disable custom domain redirect",
	})
	.input(toggleCustomDomainSchema)
	.handler(
		async ({ context: { user }, input: { organizationId, enabled } }) => {
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

			// Check if user has plan access
			const hasAccess = await checkPlanLimit(
				organizationId,
				"customDomain",
			);

			if (!hasAccess) {
				throw new ORPCError("FORBIDDEN");
			}

			// If enabling, verify domain is still configured
			if (enabled) {
				const vercelService = new VercelDomainService({
					projectId: process.env.VERCEL_PROJECT_ID || "",
					authToken: process.env.VERCEL_AUTH_TOKEN || "",
					teamId: process.env.VERCEL_TEAM_ID,
				});

				try {
					const verification = await vercelService.verifyDomain(
						organization.customDomain,
					);

					if (!verification.verified) {
						throw new ORPCError("BAD_REQUEST");
					}
				} catch (error) {
					logger.error("Failed to verify domain:", error);
					throw new ORPCError("BAD_REQUEST");
				}
			}

			// Update organization
			await updateOrganization({
				id: organizationId,
				customDomainEnabled: enabled,
				...(enabled && !organization.domainVerifiedAt
					? { domainVerifiedAt: new Date() }
					: {}),
			});

			return {
				success: true,
				enabled,
			};
		},
	);

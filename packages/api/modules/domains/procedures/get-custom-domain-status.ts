import { ORPCError } from "@orpc/server";
import { domainConfig } from "@repo/config/domains";
import { getOrganizationById } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../../organizations/lib/membership";
import { checkPlanLimit } from "../../organizations/lib/plan-limits";
import { getCustomDomainStatusSchema } from "../schema";

export const getCustomDomainStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/domains/status",
		tags: ["Domains"],
		summary: "Get custom domain status",
		description: "Get the current custom domain configuration and status",
	})
	.input(getCustomDomainStatusSchema)
	.handler(async ({ context: { user }, input: { organizationId } }) => {
		// Verify organization exists
		const organization = await getOrganizationById(organizationId);

		if (!organization) {
			throw new ORPCError("BAD_REQUEST");
		}

		// Verify user is member
		const membership = await verifyOrganizationMembership(
			organizationId,
			user.id,
		);

		if (!membership) {
			throw new ORPCError("FORBIDDEN");
		}

		// Check plan access
		const hasAccess = await checkPlanLimit(organizationId, "customDomain");

		if (!organization.customDomain) {
			return {
				domain: null,
				enabled: false,
				verified: false,
				hasAccess,
				cnameTarget: domainConfig.cnameTarget,
			};
		}

		// Verification status is based on domainVerifiedAt timestamp
		// User must click "Verify Domain" button to trigger actual verification
		const verified = !!organization.domainVerifiedAt;

		return {
			domain: organization.customDomain,
			enabled: organization.customDomainEnabled,
			verified,
			hasAccess,
			cnameTarget: domainConfig.cnameTarget,
			domainConfiguredAt: organization.domainConfiguredAt,
			domainVerifiedAt: organization.domainVerifiedAt,
		};
	});

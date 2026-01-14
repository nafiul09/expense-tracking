import { config, type Config } from "@repo/config";
import { getPurchasesByOrganizationId } from "@repo/database";
import { createPurchasesHelper } from "@repo/payments";

type LimitKey = keyof NonNullable<
	Config["payments"]["plans"][string]["limits"]
>;

/**
 * Check if an organization has access to a specific plan limit
 * @param organizationId - The organization ID to check
 * @param limitKey - The limit key to check (e.g., "customDomain")
 * @returns true if the organization has access, false otherwise
 */
export async function checkPlanLimit(
	organizationId: string,
	limitKey: LimitKey,
): Promise<boolean> {
	// Get all purchases for the organization
	const purchases = await getPurchasesByOrganizationId(organizationId);

	// Create helper to determine active plan
	const { activePlan } = createPurchasesHelper(purchases);

	if (!activePlan) {
		// No active purchase - check free plan limits
		const freePlan = config.payments.plans.free;
		if (!freePlan.limits) {
			return false;
		}

		const limitValue = freePlan.limits[
			limitKey as keyof typeof freePlan.limits
		] as boolean | number | null | undefined;

		// Boolean limits: true = enabled, false = disabled
		if (typeof limitValue === "boolean") {
			return limitValue;
		}

		// Numeric limits: null = unlimited, number = limit value
		// For boolean checks, return false if not explicitly true
		return false;
	}

	// Find the plan configuration
	const planConfig =
		config.payments.plans[
			activePlan.id as keyof typeof config.payments.plans
		];

	if (!planConfig?.limits) {
		return false;
	}

	const limitValue = planConfig.limits[
		limitKey as keyof typeof planConfig.limits
	] as boolean | number | null | undefined;

	// Boolean limits: true = enabled, false = disabled
	if (typeof limitValue === "boolean") {
		return limitValue;
	}

	// Numeric limits: null = unlimited, number = limit value
	// For boolean checks, return false if not explicitly true
	return false;
}

/**
 * Get the active plan name for an organization
 * @param organizationId - The organization ID
 * @returns The plan ID (e.g., "free", "pro", "lifetime", "enterprise")
 */
export async function getActivePlan(organizationId: string): Promise<string> {
	const purchases = await getPurchasesByOrganizationId(organizationId);
	const { activePlan } = createPurchasesHelper(purchases);

	return activePlan?.id || "free";
}

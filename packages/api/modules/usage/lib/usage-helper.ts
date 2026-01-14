import { config } from "@repo/config";
import { db } from "@repo/database/prisma/client";
import { logger } from "@repo/logs";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import type { PurchaseSchema } from "@repo/database";
import type { z } from "zod";

type PurchaseWithoutTimestamps = Omit<
	z.infer<typeof PurchaseSchema>,
	"createdAt" | "updatedAt"
>;

type PlanId = keyof typeof config.payments.plans;

/**
 * Check usage threshold and return status
 */
export function checkUsageThreshold(
	current: number,
	limit: number | null,
): {
	status: "ok" | "warning" | "blocked";
	percentage: number;
} {
	if (limit === null) {
		return { status: "ok", percentage: 0 };
	}

	const percentage = (current / limit) * 100;

	if (percentage >= 100) {
		return { status: "blocked", percentage: Math.min(percentage, 100) };
	}
	if (percentage >= 80) {
		return { status: "warning", percentage };
	}
	return { status: "ok", percentage };
}

/**
 * Get or create usage metric for an organization and metric type
 */
export async function getUsageForMetric(
	organizationId: string,
	metricType: string,
): Promise<{
	currentUsage: number;
	softLimit: number | null;
	hardLimit: number | null;
}> {
	const usageMetric = await db.usageMetric.findUnique({
		where: {
			organizationId_metricType: {
				organizationId,
				metricType,
			},
		},
	});

	if (usageMetric) {
		return {
			currentUsage: usageMetric.currentUsage,
			softLimit: usageMetric.softLimit,
			hardLimit: usageMetric.hardLimit,
		};
	}

	// Return defaults if not found
	return {
		currentUsage: 0,
		softLimit: null,
		hardLimit: null,
	};
}

/**
 * Calculate limits for an organization based on their active plan
 */
export async function calculateLimitsForOrganization(
	organizationId: string,
): Promise<{
	planId: PlanId;
	planName: string;
	limits: Record<string, number | null | boolean>;
}> {
	const org = await db.organization.findUnique({
		where: { id: organizationId },
		include: {
			purchases: {
				where: { status: "active" },
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!org) {
		throw new Error(`Organization ${organizationId} not found`);
	}

	const { activePlan } = createPurchasesHelper(
		org.purchases as PurchaseWithoutTimestamps[],
	);

	if (!activePlan) {
		// Default to free plan if no active plan
		const freePlan = Object.entries(config.payments.plans).find(
			([_, plan]) => "isFree" in plan && plan.isFree === true,
		);
		if (!freePlan) {
			throw new Error("Free plan not found in config");
		}
		return {
			planId: freePlan[0] as PlanId,
			planName: freePlan[0],
			limits: freePlan[1].limits || {},
		};
	}

	const planConfig = config.payments.plans[activePlan.id];
	if (!planConfig) {
		throw new Error(`Plan ${activePlan.id} not found in config`);
	}

	return {
		planId: activePlan.id,
		planName: activePlan.id,
		limits: planConfig.limits || {},
	};
}

/**
 * Increment usage metric atomically
 * Supports optional transaction for race-condition-free increments
 */
export async function incrementUsage(
	organizationId: string,
	metricType: string,
	tx?: any, // Prisma transaction client
): Promise<void> {
	const now = new Date();
	const client = tx || db;

	await client.usageMetric.upsert({
		where: {
			organizationId_metricType: {
				organizationId,
				metricType,
			},
		},
		create: {
			organizationId,
			metricType,
			currentUsage: 1,
			updatedAt: now,
		},
		update: {
			currentUsage: {
				increment: 1,
			},
			updatedAt: now,
		},
	});
}

/**
 * Decrement usage metric atomically
 */
export async function decrementUsage(
	organizationId: string,
	metricType: string,
): Promise<void> {
	const usageMetric = await db.usageMetric.findUnique({
		where: {
			organizationId_metricType: {
				organizationId,
				metricType,
			},
		},
	});

	if (usageMetric && usageMetric.currentUsage > 0) {
		await db.usageMetric.update({
			where: {
				organizationId_metricType: {
					organizationId,
					metricType,
				},
			},
			data: {
				currentUsage: {
					decrement: 1,
				},
				updatedAt: new Date(),
			},
		});
	}
}

/**
 * Sync usage metric with actual count
 */
export async function syncUsageMetric(
	organizationId: string,
	metricType: string,
	actualCount: number,
): Promise<void> {
	const now = new Date();
	await db.usageMetric.upsert({
		where: {
			organizationId_metricType: {
				organizationId,
				metricType,
			},
		},
		create: {
			organizationId,
			metricType,
			currentUsage: actualCount,
			updatedAt: now,
		},
		update: {
			currentUsage: actualCount,
			updatedAt: now,
		},
	});
}

/**
 * Get comprehensive usage data for a workspace
 */
export async function getWorkspaceUsageData(organizationId: string): Promise<{
	organizationId: string;
	planName: string;
	metrics: Record<
		string,
		{
			current: number;
			limit: number | null;
			status: "ok" | "warning" | "blocked";
			percentage: number;
		}
	>;
}> {
	try {
		const { planName, limits } =
			await calculateLimitsForOrganization(organizationId);

		const metrics: Record<
			string,
			{
				current: number;
				limit: number | null;
				status: "ok" | "warning" | "blocked";
				percentage: number;
			}
		> = {};

		// For each metric type defined in limits, get usage
		for (const [metricType, limitValue] of Object.entries(limits)) {
			// Skip boolean limits (like customDomain)
			if (typeof limitValue === "boolean") {
				continue;
			}

			const limit = limitValue ?? null;
			const usage = await getUsageForMetric(organizationId, metricType);
			const threshold = checkUsageThreshold(usage.currentUsage, limit);

			metrics[metricType] = {
				current: usage.currentUsage,
				limit: limit,
				status: threshold.status,
				percentage: threshold.percentage,
			};
		}

		return {
			organizationId,
			planName,
			metrics,
		};
	} catch (error) {
		logger.error("Failed to get workspace usage data:", error);
		throw error;
	}
}

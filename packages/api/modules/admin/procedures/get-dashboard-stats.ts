import { db } from "@repo/database";
import { z } from "zod";
import { adminProcedure } from "../../../orpc/procedures";

const inputSchema = z.object({
	timeFilter: z.enum(["24h", "7d", "30d", "all"]).default("30d"),
});

export const getDashboardStats = adminProcedure
	.input(inputSchema)
	.handler(async ({ input }: { input: z.infer<typeof inputSchema> }) => {
		const { timeFilter } = input;

		// Calculate the date threshold based on filter
		const now = new Date();
		let dateThreshold: Date | undefined;

		switch (timeFilter) {
			case "24h":
				dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				break;
			case "7d":
				dateThreshold = new Date(
					now.getTime() - 7 * 24 * 60 * 60 * 1000,
				);
				break;
			case "30d":
				dateThreshold = new Date(
					now.getTime() - 30 * 24 * 60 * 60 * 1000,
				);
				break;
			case "all":
				dateThreshold = undefined;
				break;
		}

		// Get total users count (with optional date filter)
		const totalUsers = await db.user.count({
			where: dateThreshold
				? {
						createdAt: {
							gte: dateThreshold,
						},
					}
				: undefined,
		});

		// Get all users with their purchases
		const usersWithPurchases = await db.user.findMany({
			where: dateThreshold
				? {
						createdAt: {
							gte: dateThreshold,
						},
					}
				: undefined,
			select: {
				id: true,
			},
		});

		const userIds = usersWithPurchases.map((u) => u.id);

		// Get purchases for these users
		const purchases = await db.purchase.findMany({
			where: {
				userId: {
					in: userIds,
				},
				status: "active",
			},
			select: {
				userId: true,
				type: true,
			},
		});

		// Calculate statistics
		const usersWithActivePurchases = new Set(
			purchases.map((p) => p.userId),
		);
		const paidUsers = usersWithActivePurchases.size;
		const freeUsers = totalUsers - paidUsers;

		// Count lifetime vs subscription users
		const lifetimePurchases = purchases.filter(
			(p) => p.type === "ONE_TIME",
		);
		const subscriptionPurchases = purchases.filter(
			(p) => p.type === "SUBSCRIPTION",
		);

		const lifetimeUserIds = new Set(lifetimePurchases.map((p) => p.userId));
		const subscriptionUserIds = new Set(
			subscriptionPurchases.map((p) => p.userId),
		);

		return {
			totalUsers,
			freeUsers,
			paidUsers,
			lifetimeUsers: lifetimeUserIds.size,
			subscriptionUsers: subscriptionUserIds.size,
		};
	});

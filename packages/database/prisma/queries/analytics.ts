import { db } from "../client";

export async function getExpenseOverview(
	businessId: string,
	startDate?: Date,
	endDate?: Date,
) {
	const where: any = {
		businessId,
		status: "active",
	};

	if (startDate || endDate) {
		where.date = {};
		if (startDate) {
			where.date.gte = startDate;
		}
		if (endDate) {
			where.date.lte = endDate;
		}
	}

	const [totalExpenses, expenseCount, categoryBreakdown] = await Promise.all([
		db.expense.aggregate({
			where,
			_sum: {
				amount: true,
			},
		}),
		db.expense.count({
			where,
		}),
		db.expense.groupBy({
			by: ["categoryId"],
			where,
			_sum: {
				amount: true,
			},
			_count: {
				id: true,
			},
		}),
	]);

	return {
		totalExpenses: totalExpenses._sum.amount || 0,
		expenseCount,
		categoryBreakdown,
	};
}

export async function getCategoryBreakdown(
	businessId: string,
	startDate?: Date,
	endDate?: Date,
) {
	const where: any = {
		businessId,
		status: "active",
	};

	if (startDate || endDate) {
		where.date = {};
		if (startDate) {
			where.date.gte = startDate;
		}
		if (endDate) {
			where.date.lte = endDate;
		}
	}

	const breakdown = await db.expense.groupBy({
		by: ["categoryId"],
		where,
		_sum: {
			amount: true,
		},
		_count: {
			id: true,
		},
	});

	// Fetch category names
	const categoryIds = breakdown.map((b) => b.categoryId);
	const categories = await db.expenseCategory.findMany({
		where: {
			id: { in: categoryIds },
		},
	});

	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

	return breakdown.map((b) => ({
		categoryId: b.categoryId,
		categoryName: categoryMap.get(b.categoryId) || "Unknown",
		totalAmount: b._sum.amount || 0,
		count: b._count.id,
	}));
}

export async function getTrendAnalysis(
	businessId: string,
	startDate: Date,
	endDate: Date,
	groupBy: "day" | "week" | "month" = "month",
) {
	const expenses = await db.expense.findMany({
		where: {
			businessId,
			status: "active",
			date: {
				gte: startDate,
				lte: endDate,
			},
		},
		select: {
			date: true,
			amount: true,
		},
		orderBy: {
			date: "asc",
		},
	});

	// Group expenses by period
	const grouped: Record<string, number> = {};

	for (const expense of expenses) {
		let key: string;
		const date = new Date(expense.date);

		if (groupBy === "day") {
			key = date.toISOString().split("T")[0];
		} else if (groupBy === "week") {
			const weekStart = new Date(date);
			weekStart.setDate(date.getDate() - date.getDay());
			key = weekStart.toISOString().split("T")[0];
		} else {
			key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
				2,
				"0",
			)}`;
		}

		grouped[key] = (grouped[key] || 0) + Number(expense.amount);
	}

	return Object.entries(grouped).map(([period, total]) => ({
		period,
		total,
	}));
}

export async function compareBusinesses(
	organizationId: string,
	startDate?: Date,
	endDate?: Date,
) {
	const where: any = {
		business: {
			organizationId,
		},
		status: "active",
	};

	if (startDate || endDate) {
		where.date = {};
		if (startDate) {
			where.date.gte = startDate;
		}
		if (endDate) {
			where.date.lte = endDate;
		}
	}

	const breakdown = await db.expense.groupBy({
		by: ["businessId"],
		where,
		_sum: {
			amount: true,
		},
		_count: {
			id: true,
		},
	});

	// Fetch business names
	const businessIds = breakdown.map((b) => b.businessId);
	const businesses = await db.expenseAccount.findMany({
		where: {
			id: { in: businessIds },
		},
	});

	const businessMap = new Map(
		businesses.map((b: { id: string; name: string }) => [b.id, b.name]),
	);

	return breakdown.map((b) => ({
		businessId: b.businessId,
		businessName: businessMap.get(b.businessId) || "Unknown",
		totalAmount: b._sum.amount || 0,
		count: b._count.id,
	}));
}

export async function getTeamMemberExpenseSummary(
	businessId: string,
	startDate?: Date,
	endDate?: Date,
) {
	const where: any = {
		businessId,
		status: "active",
		teamMemberId: { not: null },
	};

	if (startDate || endDate) {
		where.date = {};
		if (startDate) {
			where.date.gte = startDate;
		}
		if (endDate) {
			where.date.lte = endDate;
		}
	}

	const breakdown = await db.expense.groupBy({
		by: ["teamMemberId"],
		where,
		_sum: {
			amount: true,
		},
		_count: {
			id: true,
		},
	});

	// Fetch team member names
	const teamMemberIds = breakdown
		.map((b) => b.teamMemberId)
		.filter((id): id is string => id !== null);
	const teamMembers = await db.teamMember.findMany({
		where: {
			id: { in: teamMemberIds },
		},
	});

	const teamMemberMap = new Map(teamMembers.map((tm) => [tm.id, tm.name]));

	return breakdown
		.filter((b) => b.teamMemberId !== null)
		.map((b) => ({
			teamMemberId: b.teamMemberId!,
			teamMemberName: teamMemberMap.get(b.teamMemberId!) || "Unknown",
			totalAmount: b._sum.amount || 0,
			count: b._count.id,
		}));
}

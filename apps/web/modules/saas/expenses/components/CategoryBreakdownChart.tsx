"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface CategoryBreakdownChartProps {
	businessId: string;
	startDate?: Date;
	endDate?: Date;
}

export function CategoryBreakdownChart({
	businessId,
	startDate,
	endDate,
}: CategoryBreakdownChartProps) {
	const t = useTranslations();

	const { data: breakdown, isLoading } = useQuery({
		queryKey: ["categoryBreakdown", businessId, startDate, endDate],
		queryFn: () =>
			expensesApi.analytics.getCategoryBreakdown({
				businessId,
				startDate,
				endDate,
			}),
	});

	if (isLoading) {
		return <div className="h-64 animate-pulse bg-muted rounded" />;
	}

	if (!breakdown || breakdown.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-8">
				{t("expenses.analytics.noData")}
			</p>
		);
	}

	const total = breakdown.reduce(
		(sum, item) => sum + Number(item.totalAmount),
		0,
	);

	return (
		<div className="space-y-4">
			{breakdown.map((item) => {
				const percentage =
					total > 0 ? (Number(item.totalAmount) / total) * 100 : 0;
				return (
					<div key={item.categoryId} className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium">
								{item.categoryName}
							</span>
							<span>
								${Number(item.totalAmount).toFixed(2)} (
								{percentage.toFixed(1)}%)
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all"
								style={{ width: `${percentage}%` }}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface TrendChartProps {
	businessId: string;
	startDate: Date;
	endDate: Date;
	groupBy?: "day" | "week" | "month";
}

export function TrendChart({
	businessId,
	startDate,
	endDate,
	groupBy = "month",
}: TrendChartProps) {
	const t = useTranslations();

	const { data: trends, isLoading } = useQuery({
		queryKey: ["trends", businessId, startDate, endDate, groupBy],
		queryFn: () =>
			expensesApi.analytics.getTrendAnalysis({
				businessId,
				startDate,
				endDate,
				groupBy,
			}),
	});

	if (isLoading) {
		return <div className="h-64 animate-pulse bg-muted rounded" />;
	}

	if (!trends || trends.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-8">
				{t("expenses.analytics.noData")}
			</p>
		);
	}

	const maxValue = Math.max(...trends.map((t) => Number(t.total)));

	return (
		<div className="space-y-2">
			{trends.map((trend) => {
				const percentage =
					maxValue > 0 ? (Number(trend.total) / maxValue) * 100 : 0;
				return (
					<div key={trend.period} className="flex items-center gap-4">
						<span className="w-24 text-sm text-muted-foreground">
							{trend.period}
						</span>
						<div className="flex-1">
							<div className="h-6 w-full overflow-hidden rounded bg-muted">
								<div
									className="h-full bg-primary transition-all"
									style={{ width: `${percentage}%` }}
								/>
							</div>
						</div>
						<span className="w-20 text-right text-sm font-medium">
							${Number(trend.total).toFixed(2)}
						</span>
					</div>
				);
			})}
		</div>
	);
}

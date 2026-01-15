"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

interface BusinessComparisonChartProps {
	organizationId: string;
	startDate?: Date;
	endDate?: Date;
}

export function BusinessComparisonChart({
	organizationId,
	startDate,
	endDate,
}: BusinessComparisonChartProps) {
	const t = useTranslations();

	const { data: comparison, isLoading } = useQuery({
		queryKey: ["businessComparison", organizationId, startDate, endDate],
		queryFn: () =>
			expensesApi.analytics.compareBusinesses({
				organizationId,
				startDate,
				endDate,
			}),
	});

	if (isLoading) {
		return <div className="h-64 animate-pulse bg-muted rounded" />;
	}

	if (!comparison || comparison.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-8">
				{t("expenses.analytics.noData")}
			</p>
		);
	}

	const maxValue = Math.max(...comparison.map((c) => Number(c.totalAmount)));

	return (
		<div className="space-y-2">
			{comparison.map((item) => {
				const percentage =
					maxValue > 0
						? (Number(item.totalAmount) / maxValue) * 100
						: 0;
				return (
					<div
						key={item.businessId}
						className="flex items-center gap-4"
					>
						<span className="w-32 text-sm font-medium">
							{item.businessName}
						</span>
						<div className="flex-1">
							<div className="h-6 w-full overflow-hidden rounded bg-muted">
								<div
									className="h-full bg-primary transition-all"
									style={{ width: `${percentage}%` }}
								/>
							</div>
						</div>
						<span className="w-24 text-right text-sm font-medium">
							${Number(item.totalAmount).toFixed(2)}
						</span>
						<span className="w-16 text-right text-muted-foreground text-sm">
							({item.count} {t("expenses.analytics.expenses")})
						</span>
					</div>
				);
			})}
		</div>
	);
}

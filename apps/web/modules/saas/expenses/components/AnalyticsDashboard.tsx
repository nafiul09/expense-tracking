"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@ui/components/card";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BusinessComparisonChart } from "./BusinessComparisonChart";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { TrendChart } from "./TrendChart";

interface AnalyticsDashboardProps {
	organizationId: string;
}

export default function AnalyticsDashboard({
	organizationId,
}: AnalyticsDashboardProps) {
	const t = useTranslations();
	const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
		null,
	);

	const { data: businesses } = useQuery({
		queryKey: ["businesses", organizationId],
		queryFn: () => expensesApi.businesses.list(organizationId),
	});

	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - 6);
	const endDate = new Date();

	// Auto-select first business if available
	useEffect(() => {
		if (businesses && businesses.length > 0 && !selectedBusinessId) {
			setSelectedBusinessId(businesses[0].id);
		}
	}, [businesses, selectedBusinessId]);

	return (
		<div className="space-y-6">
			{businesses && businesses.length > 0 && (
				<Card className="p-4">
					<div className="flex items-center gap-4">
						<Label>{t("expenses.analytics.selectExpenseAccount")}</Label>
						<Select
							value={selectedBusinessId || ""}
							onValueChange={(value) =>
								setSelectedBusinessId(value)
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{businesses.map((business) => (
									<SelectItem
										key={business.id}
										value={business.id}
									>
										{business.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</Card>
			)}

			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="p-6">
					<h3 className="mb-4 font-semibold">
						{t("expenses.analytics.categoryBreakdown")}
					</h3>
					{selectedBusinessId ? (
						<CategoryBreakdownChart
							businessId={selectedBusinessId}
							startDate={startDate}
							endDate={endDate}
						/>
					) : (
						<p className="text-muted-foreground text-center py-8">
							{t("expenses.analytics.selectExpenseAccount")}
						</p>
					)}
				</Card>

				<Card className="p-6">
					<h3 className="mb-4 font-semibold">
						{t("expenses.analytics.trends")}
					</h3>
					{selectedBusinessId ? (
						<TrendChart
							businessId={selectedBusinessId}
							startDate={startDate}
							endDate={endDate}
						/>
					) : (
						<p className="text-muted-foreground text-center py-8">
							{t("expenses.analytics.selectExpenseAccount")}
						</p>
					)}
				</Card>
			</div>

			<Card className="p-6">
				<h3 className="mb-4 font-semibold">
					{t("expenses.analytics.expenseAccountComparison")}
				</h3>
				<BusinessComparisonChart
					organizationId={organizationId}
					startDate={startDate}
					endDate={endDate}
				/>
			</Card>
		</div>
	);
}

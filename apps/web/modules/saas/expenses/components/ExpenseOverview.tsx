"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@ui/components/card";
import { DollarSignIcon, ReceiptIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ExpenseOverviewProps {
	organizationId: string;
}

export function ExpenseOverview({ organizationId }: ExpenseOverviewProps) {
	const t = useTranslations();

	const { data: businesses } = useQuery({
		queryKey: ["businesses", organizationId],
		queryFn: () => expensesApi.businesses.list(organizationId),
	});

	const totalBusinesses = businesses?.length || 0;
	const totalTeamMembers =
		businesses?.reduce((sum, b) => sum + (b._count?.teamMembers || 0), 0) ||
		0;
	const totalExpenses =
		businesses?.reduce((sum, b) => sum + (b._count?.expenses || 0), 0) || 0;

	const stats = [
		{
			label: t("expenses.dashboard.stats.expenseAccounts"),
			value: totalBusinesses,
			icon: ReceiptIcon,
		},
		{
			label: t("expenses.dashboard.stats.teamMembers"),
			value: totalTeamMembers,
			icon: TrendingUpIcon,
		},
		{
			label: t("expenses.dashboard.stats.totalExpenses"),
			value: totalExpenses,
			icon: DollarSignIcon,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-3">
			{stats.map((stat) => (
				<Card key={stat.label} className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{stat.label}
							</p>
							<p className="text-2xl font-bold">{stat.value}</p>
						</div>
						<stat.icon className="text-muted-foreground size-8" />
					</div>
				</Card>
			))}
		</div>
	);
}

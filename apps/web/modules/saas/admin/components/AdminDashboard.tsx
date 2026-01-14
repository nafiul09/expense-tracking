"use client";

import { PageHeader } from "@saas/shared/components/PageHeader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	UsersIcon,
	UserCheckIcon,
	CreditCardIcon,
	SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type TimeFilter = "24h" | "7d" | "30d" | "all";

export function AdminDashboard() {
	const t = useTranslations();
	const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");

	// TODO: Replace with actual API calls
	const stats = {
		totalUsers: 1247,
		freeUsers: 892,
		paidUsers: 355,
		lifetimeUsers: 45,
		subscriptionUsers: 310,
	};

	const statsCards = [
		{
			title: t("admin.dashboard.stats.totalUsers"),
			value: stats.totalUsers,
			icon: UsersIcon,
			description: t("admin.dashboard.stats.totalUsersDesc"),
		},
		{
			title: t("admin.dashboard.stats.freeUsers"),
			value: stats.freeUsers,
			icon: UserCheckIcon,
			description: t("admin.dashboard.stats.freeUsersDesc"),
		},
		{
			title: t("admin.dashboard.stats.paidUsers"),
			value: stats.paidUsers,
			icon: CreditCardIcon,
			description: t("admin.dashboard.stats.paidUsersDesc"),
		},
		{
			title: t("admin.dashboard.stats.lifetimeUsers"),
			value: stats.lifetimeUsers,
			icon: SparklesIcon,
			description: t("admin.dashboard.stats.lifetimeUsersDesc"),
		},
		{
			title: t("admin.dashboard.stats.subscriptionUsers"),
			value: stats.subscriptionUsers,
			icon: CreditCardIcon,
			description: t("admin.dashboard.stats.subscriptionUsersDesc"),
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<PageHeader
					title={t("admin.dashboard.title")}
					subtitle={t("admin.dashboard.description")}
				/>
				<Select
					value={timeFilter}
					onValueChange={(value) =>
						setTimeFilter(value as TimeFilter)
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="24h">
							{t("admin.dashboard.filters.last24h")}
						</SelectItem>
						<SelectItem value="7d">
							{t("admin.dashboard.filters.last7d")}
						</SelectItem>
						<SelectItem value="30d">
							{t("admin.dashboard.filters.last30d")}
						</SelectItem>
						<SelectItem value="all">
							{t("admin.dashboard.filters.allTime")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{statsCards.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<stat.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stat.value.toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{stat.description}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

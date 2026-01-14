"use client";

import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { usageApi } from "../lib/api";
import { UsageCard } from "./UsageCard";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

interface UsageSectionProps {
	organizationId: string;
}

export function UsageSection({ organizationId }: UsageSectionProps) {
	const t = useTranslations();

	const { data: usageData, isLoading } = useQuery({
		queryKey: ["workspace-usage", organizationId],
		queryFn: () => usageApi.getWorkspaceUsage(organizationId),
	});

	if (isLoading) {
		return (
			<SettingsItem title={t("usage.title")}>
				<div className="space-y-3">
					<div className="h-20 animate-pulse rounded-lg bg-muted" />
				</div>
			</SettingsItem>
		);
	}

	if (!usageData || Object.keys(usageData.metrics).length === 0) {
		return null;
	}

	// Map metric types to labels
	const metricLabels: Record<string, string> = {
		shares: t("usage.metrics.shares"),
		projects: t("usage.metrics.projects"),
		aiAnalyses: t("usage.metrics.aiAnalyses"),
	};

	return (
		<SettingsItem
			title={t("usage.title")}
			description={t("usage.description")}
		>
			<div className="space-y-3">
				{Object.entries(usageData.metrics).map(
					([metricType, metric]) => (
						<UsageCard
							key={metricType}
							metricType={metricType}
							label={metricLabels[metricType] || metricType}
							current={metric.current}
							limit={metric.limit}
							status={metric.status}
							percentage={metric.percentage}
							organizationId={organizationId}
						/>
					),
				)}
			</div>
		</SettingsItem>
	);
}

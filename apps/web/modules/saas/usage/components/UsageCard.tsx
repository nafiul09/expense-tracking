"use client";

import { Button } from "@ui/components/button";
import { Progress } from "@ui/components/progress";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import { AlertTriangleIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

interface UsageCardProps {
	metricType: string;
	label: string;
	current: number;
	limit: number | null;
	status: "ok" | "warning" | "blocked";
	percentage: number;
	organizationId: string;
}

export function UsageCard({
	metricType: _metricType,
	label,
	current,
	limit,
	status,
	percentage,
	organizationId,
}: UsageCardProps) {
	const t = useTranslations();

	const isUnlimited = limit === null;
	const displayLimit = isUnlimited ? t("usage.unlimited") : limit;

	return (
		<div className="rounded-lg border p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h4 className="font-semibold text-sm">{label}</h4>
					{status === "warning" && (
						<AlertTriangleIcon className="h-4 w-4 text-warning" />
					)}
					{status === "blocked" && (
						<Badge status="error" className="text-xs">
							{t("usage.blocked.badge")}
						</Badge>
					)}
				</div>
				{!isUnlimited && status !== "ok" && (
					<Button
						variant="outline"
						size="sm"
						asChild
						className="h-8 text-xs"
					>
						<Link href={`/${organizationId}/settings/billing`}>
							{t("usage.upgrade")}
							<ArrowUpRightIcon className="ml-1 h-3 w-3" />
						</Link>
					</Button>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						{isUnlimited
							? t("usage.currentUnlimited", { current })
							: t("usage.current", {
									current,
									limit: displayLimit,
								})}
					</span>
					{!isUnlimited && (
						<span
							className={cn(
								"font-medium",
								status === "blocked" && "text-destructive",
								status === "warning" && "text-warning",
							)}
						>
							{t("usage.percentage", {
								percentage: Math.round(percentage),
							})}
						</span>
					)}
				</div>

				{!isUnlimited && (
					<Progress
						value={Math.min(percentage, 100)}
						className="h-2"
					/>
				)}

				{isUnlimited && (
					<Badge status="info" className="text-xs">
						{t("usage.unlimited")}
					</Badge>
				)}
			</div>
		</div>
	);
}

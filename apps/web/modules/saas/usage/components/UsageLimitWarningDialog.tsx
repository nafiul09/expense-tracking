"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { AlertTriangleIcon, ArrowUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface UsageLimitWarningDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	metricType: string;
	current: number;
	limit: number;
	percentage: number;
	onContinue: () => void;
}

export function UsageLimitWarningDialog({
	open,
	onOpenChange,
	organizationId,
	metricType,
	current,
	limit,
	percentage,
	onContinue,
}: UsageLimitWarningDialogProps) {
	const t = useTranslations();

	const handleContinue = () => {
		onContinue();
		onOpenChange(false);
	};

	const handleUpgrade = () => {
		onOpenChange(false);
		// Navigation will happen via Link component
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5 text-warning" />
						<DialogTitle>{t("usage.warning.title")}</DialogTitle>
					</div>
					<DialogDescription>
						{t("usage.warning.message", {
							percentage: Math.round(percentage),
							metricType: t(`usage.metrics.${metricType}`),
						})}
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border bg-muted/50 p-4 space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{t("usage.current", { current, limit })}
						</span>
						<span className="font-medium text-warning">
							{t("usage.percentage", {
								percentage: Math.round(percentage),
							})}
						</span>
					</div>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						type="button"
						variant="outline"
						onClick={handleContinue}
						className="w-full sm:w-auto"
					>
						{t("usage.warning.continue")}
					</Button>
					<Button
						type="button"
						onClick={handleUpgrade}
						asChild
						className="w-full sm:w-auto"
					>
						<Link href={`/${organizationId}/settings/billing`}>
							{t("usage.warning.upgrade")}
							<ArrowUpRightIcon className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

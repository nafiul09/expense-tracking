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
import { AlertCircleIcon, ArrowUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface UsageLimitBlockedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	metricType: string;
	current: number;
	limit: number;
}

export function UsageLimitBlockedDialog({
	open,
	onOpenChange,
	organizationId,
	metricType,
	current,
	limit,
}: UsageLimitBlockedDialogProps) {
	const t = useTranslations();

	const handleUpgrade = () => {
		onOpenChange(false);
		// Navigation will happen via Link component
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertCircleIcon className="h-5 w-5 text-destructive" />
						<DialogTitle>{t("usage.blocked.title")}</DialogTitle>
					</div>
					<DialogDescription>
						{t("usage.blocked.message", {
							metricType: t(`usage.metrics.${metricType}`),
							limit,
						})}
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border bg-muted/50 p-4 space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{t("usage.current", { current, limit })}
						</span>
						<span className="font-medium text-destructive">
							{t("usage.percentage", { percentage: 100 })}
						</span>
					</div>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="w-full sm:w-auto"
					>
						{t("usage.blocked.viewUsage")}
					</Button>
					<Button
						type="button"
						onClick={handleUpgrade}
						asChild
						className="w-full sm:w-auto"
					>
						<Link href={`/${organizationId}/settings/billing`}>
							{t("usage.blocked.upgrade")}
							<ArrowUpRightIcon className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

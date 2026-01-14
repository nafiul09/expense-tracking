"use client";

import { usePlanData } from "@saas/payments/hooks/plan-data";
import { usePurchases } from "@saas/payments/hooks/purchases";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { Card, CardContent } from "@ui/components/card";
import { Progress } from "@ui/components/progress";
import { ShimmerButton } from "@ui/components/shimmer-button";
import { Button } from "@ui/components/button";
import { useSidebar } from "@ui/components/sidebar";
import { CrownIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function PlanUsageCard() {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const { state } = useSidebar();

	// All hooks must be called before any conditional returns
	const { activePlan } = usePurchases(activeOrganization?.id);
	const { planData } = usePlanData();

	// Only show for workspace, not personal account
	if (!activeOrganization) {
		return null;
	}

	// Hide card when sidebar is collapsed to icon mode
	if (state === "collapsed") {
		return null;
	}

	if (!activePlan) {
		return null;
	}

	const planId = activePlan.id as keyof typeof planData;
	const planInfo = planData[planId];

	if (!planInfo) {
		return null;
	}

	const isFreePlan = planId === "free";

	// Static usage values: 25 out of 50 (50%)
	const usedAmount = 25;
	const totalAmount = 50;
	const progressPercentage = (usedAmount / totalAmount) * 100;

	const billingUrl = `/${activeOrganization.slug}/settings/billing`;

	return (
		<Card className="mt-2 border-sidebar-border bg-sidebar">
			<CardContent className="p-3 space-y-3">
				{/* Plan Name */}
				<div className="space-y-1">
					<p className="text-xs font-semibold text-sidebar-foreground">
						{planInfo.title}
					</p>
					<p className="text-xs text-muted-foreground leading-relaxed">
						{planInfo.description}
					</p>
					<p className="text-xs text-muted-foreground">
						{usedAmount} / {totalAmount} used
					</p>
				</div>

				{/* Progress Bar */}
				<Progress value={progressPercentage} className="h-2" />

				{/* Action Button */}
				{isFreePlan ? (
					<Link href={billingUrl} className="block">
						<ShimmerButton
							className="w-full"
							innerClassName="text-xs"
						>
							<CrownIcon className="size-3" />
							<span>{t("app.sidebar.upgrade")}</span>
						</ShimmerButton>
					</Link>
				) : (
					<Button
						asChild
						variant="outline"
						size="sm"
						className="w-full text-xs"
					>
						<Link href={billingUrl}>
							<span>{t("app.sidebar.viewPlan")}</span>
						</Link>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

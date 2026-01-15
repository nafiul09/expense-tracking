"use client";

import { formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { format } from "date-fns";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ReportViewerProps {
	reportId: string;
}

export default function ReportViewer({ reportId }: ReportViewerProps) {
	const t = useTranslations();

	const { data: report, isLoading } = useQuery({
		queryKey: ["report", reportId],
		queryFn: () => expensesApi.reports.getDetails(reportId),
	});

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	if (!report) {
		return <div>{t("expenses.reports.notFound")}</div>;
	}

	const reportData = report.reportData as any;

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-xl font-bold">
							{t("expenses.reports.reportTitle")}
						</h2>
						<p className="text-muted-foreground mt-1">
							{format(
								new Date(report.reportPeriodStart),
								"MMM dd, yyyy",
							)}{" "}
							-{" "}
							{format(
								new Date(report.reportPeriodEnd),
								"MMM dd, yyyy",
							)}
						</p>
					</div>
					<Button>
						<DownloadIcon className="mr-2 size-4" />
						{t("expenses.reports.download")}
					</Button>
				</div>

				<div className="mb-6">
					<p className="text-2xl font-bold">
						{formatCurrency(
							Number(report.totalExpenses),
							report.reportCurrency || "USD",
						)}
					</p>
					<p className="text-muted-foreground text-sm">
						{t("expenses.reports.totalExpenses")} (
						{report.reportCurrency || "USD"})
					</p>
				</div>

				{reportData?.businesses && reportData.businesses.length > 0 && (
					<div className="space-y-4">
						<h3 className="font-semibold">
							{t("expenses.reports.expenseAccountBreakdown")}
						</h3>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{t("expenses.reports.table.business")}
									</TableHead>
									<TableHead>
										{t(
											"expenses.reports.table.totalExpenses",
										)}
									</TableHead>
									<TableHead>
										{t(
											"expenses.reports.table.expenseCount",
										)}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{reportData.businesses.map((business: any) => (
									<TableRow key={business.businessId}>
										<TableCell className="font-medium">
											{business.businessName}
										</TableCell>
										<TableCell>
											{formatCurrency(
												Number(business.totalExpenses),
												report.reportCurrency || "USD",
											)}
										</TableCell>
										<TableCell>
											{business.expenseCount}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</Card>
		</div>
	);
}

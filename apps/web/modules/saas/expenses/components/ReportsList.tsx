"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
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
import { DownloadIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface ReportsListProps {
	organizationId: string;
}

export default function ReportsList({ organizationId }: ReportsListProps) {
	const t = useTranslations();
	const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
	const { activeOrganization } = useActiveOrganization();

	const { data: reports, isLoading } = useQuery({
		queryKey: ["reports", organizationId],
		queryFn: () => expensesApi.reports.list({ organizationId }),
	});

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					{t("expenses.reports.title")}
				</h2>
				<Button onClick={() => setGenerateDialogOpen(true)}>
					<PlusIcon className="mr-2 size-4" />
					{t("expenses.reports.generate")}
				</Button>
			</div>

			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.reports.table.period")}
							</TableHead>
							<TableHead>
								{t("expenses.reports.table.totalExpenses")}
							</TableHead>
							<TableHead>
								{t("expenses.reports.table.generatedAt")}
							</TableHead>
							<TableHead>
								{t("expenses.reports.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reports && reports.length > 0 ? (
							reports.map((report) => (
								<TableRow key={report.id}>
									<TableCell>
										{format(
											new Date(report.reportPeriodStart),
											"MMM dd, yyyy",
										)}{" "}
										-{" "}
										{format(
											new Date(report.reportPeriodEnd),
											"MMM dd, yyyy",
										)}
									</TableCell>
									<TableCell className="font-medium">
										$
										{Number(report.totalExpenses).toFixed(
											2,
										)}
									</TableCell>
									<TableCell>
										{format(
											new Date(report.generatedAt),
											"MMM dd, yyyy HH:mm",
										)}
									</TableCell>
									<TableCell>
										<Link
											href={`/${activeOrganization?.slug}/expenses/reports/${report.id}`}
										>
											<Button variant="ghost" size="sm">
												<DownloadIcon className="mr-2 size-4" />
												{t("expenses.reports.view")}
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.reports.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			<GenerateReportDialog
				open={generateDialogOpen}
				onOpenChange={setGenerateDialogOpen}
				organizationId={organizationId}
			/>
		</div>
	);
}

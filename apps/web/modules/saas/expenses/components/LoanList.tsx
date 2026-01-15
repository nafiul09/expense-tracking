"use client";

import { config } from "@repo/config";
import { formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
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
import { useTranslations } from "next-intl";

interface LoanListProps {
	businessId: string;
}

export function LoanList({ businessId }: LoanListProps) {
	const t = useTranslations();

	const { data: loans, isLoading } = useQuery({
		queryKey: ["loans", businessId],
		queryFn: () => expensesApi.loans.list({ businessId }),
	});

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	// Get currency rate for the business currency
	const businessCurrency =
		business?.currency || config.expenses.defaultBaseCurrency;
	const currencyRate =
		businessCurrency === config.expenses.defaultBaseCurrency
			? null
			: currencyRates?.find((r) => r.toCurrency === businessCurrency);

	return (
		<div className="space-y-4">
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.loans.table.teamMember")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.principal")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.remaining")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.date")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loans && loans.length > 0 ? (
							loans.map((loan) => (
								<TableRow key={loan.id}>
									<TableCell className="font-medium">
										{loan.teamMember.name}
									</TableCell>
									<TableCell>
										{formatCurrency(
											Number(loan.principalAmount),
											businessCurrency,
											currencyRate || undefined,
										)}
									</TableCell>
									<TableCell>
										{formatCurrency(
											Number(loan.remainingAmount),
											businessCurrency,
											currencyRate || undefined,
										)}
									</TableCell>
									<TableCell>
										{format(
											new Date(loan.loanDate),
											"MMM dd, yyyy",
										)}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												loan.status === "paid"
													? "default"
													: loan.status === "active"
														? "secondary"
														: "outline"
											}
										>
											{loan.status}
										</Badge>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.loans.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

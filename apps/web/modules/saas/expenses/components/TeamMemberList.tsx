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
import { useTranslations } from "next-intl";

interface TeamMemberListProps {
	businessId: string;
}

export function TeamMemberList({ businessId }: TeamMemberListProps) {
	const t = useTranslations();

	const { data: teamMembers, isLoading } = useQuery({
		queryKey: ["teamMembers", businessId],
		queryFn: () => expensesApi.teamMembers.list(businessId),
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
								{t("expenses.teamMembers.table.name")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.position")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.salary")}
							</TableHead>
							<TableHead>
								{t("teamMembers.loanBalance")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamMembers && teamMembers.length > 0 ? (
							teamMembers.map((member) => (
								<TableRow key={member.id}>
									<TableCell className="font-medium">
										{member.name}
									</TableCell>
									<TableCell>
										{member.position || "-"}
									</TableCell>
									<TableCell>
										{member.salary
											? formatCurrency(
													Number(member.salary),
													businessCurrency,
													currencyRate || undefined,
												)
											: "-"}
									</TableCell>
									<TableCell>
										{member.totalLoanBalance &&
										Number(member.totalLoanBalance) > 0
											? formatCurrency(
													Number(
														member.totalLoanBalance,
													),
													businessCurrency,
													currencyRate || undefined,
												)
											: t("teamMembers.noLoans")}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												member.status === "active"
													? "default"
													: "secondary"
											}
										>
											{member.status === "active"
												? t(
														"expenses.teamMembers.status.active",
													)
												: member.status === "inactive"
													? t(
															"expenses.teamMembers.status.inactive",
														)
													: member.status}
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
									{t("expenses.teamMembers.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

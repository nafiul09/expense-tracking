"use client";

import { config } from "@repo/config";
import { formatAmountWithOriginal, formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Progress } from "@ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { format } from "date-fns";
import { BanknoteIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface ConsolidatedLoansDashboardProps {
	organizationId: string;
}

export default function ConsolidatedLoansDashboard({
	organizationId,
}: ConsolidatedLoansDashboardProps) {
	const t = useTranslations();
	const [filters, setFilters] = useState({
		accountIds: [] as string[],
		teamMemberIds: [] as string[],
		status: undefined as string | undefined,
		loanDateStart: undefined as Date | undefined,
		loanDateEnd: undefined as Date | undefined,
	});
	const [reportDialogOpen, setReportDialogOpen] = useState(false);

	const { data: loans, isLoading } = useQuery({
		queryKey: ["all-standalone-loans", organizationId, filters],
		queryFn: () =>
			expensesApi.loans.listStandalone({
				organizationId,
				...filters,
			}),
	});

	const { data: expenseAccounts } = useQuery({
		queryKey: ["expenseAccounts", organizationId],
		queryFn: () => expensesApi.expenseAccounts.list(organizationId),
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", organizationId],
		queryFn: () => expensesApi.currencies.list(organizationId),
	});

	// Get unique team members from loans for filter
	const teamMembers = useMemo(() => {
		if (!loans) {
			return [];
		}
		const memberMap = new Map();
		loans.forEach((loan) => {
			if (loan.teamMember && !memberMap.has(loan.teamMember.id)) {
				memberMap.set(loan.teamMember.id, loan.teamMember);
			}
		});
		return Array.from(memberMap.values());
	}, [loans]);

	const summaryStats = useMemo(() => {
		if (!loans) {
			return {
				totalActive: 0,
				totalOutstanding: 0,
				totalPaid: 0,
			};
		}

		const activeLoans = loans.filter(
			(l) => l.status === "active" || l.status === "partial",
		);
		const totalOutstanding = activeLoans.reduce(
			(sum, l) => sum + Number(l.currentBalance),
			0,
		);
		const totalPaid = loans.reduce((sum, l) => {
			const principal = Number(l.principalAmount);
			const remaining = Number(l.currentBalance);
			return sum + (principal - remaining);
		}, 0);

		return {
			totalActive: activeLoans.length,
			totalOutstanding,
			totalPaid,
		};
	}, [loans]);

	const handleAccountToggle = (accountId: string) => {
		setFilters((prev) => ({
			...prev,
			accountIds: prev.accountIds.includes(accountId)
				? prev.accountIds.filter((id) => id !== accountId)
				: [...prev.accountIds, accountId],
		}));
	};

	const handleTeamMemberToggle = (teamMemberId: string) => {
		setFilters((prev) => ({
			...prev,
			teamMemberIds: prev.teamMemberIds.includes(teamMemberId)
				? prev.teamMemberIds.filter((id) => id !== teamMemberId)
				: [...prev.teamMemberIds, teamMemberId],
		}));
	};

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t("expenses.loans.consolidated.totalActive")}
							</p>
							<p className="text-2xl font-bold">
								{summaryStats.totalActive}
							</p>
						</div>
						<BanknoteIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.loans.consolidated.totalOutstanding",
								)}
							</p>
							<p className="text-2xl font-bold">
								{formatCurrency(
									summaryStats.totalOutstanding,
									config.expenses.defaultBaseCurrency,
									currencyRates?.find(
										(r) =>
											r.toCurrency ===
											config.expenses.defaultBaseCurrency,
									),
								)}
							</p>
						</div>
						<FileTextIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t("expenses.loans.consolidated.totalPaid")}
							</p>
							<p className="text-2xl font-bold">
								{formatCurrency(
									summaryStats.totalPaid,
									config.expenses.defaultBaseCurrency,
									currencyRates?.find(
										(r) =>
											r.toCurrency ===
											config.expenses.defaultBaseCurrency,
									),
								)}
							</p>
						</div>
						<PlusIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
			</div>

			{/* Filters */}
			<Card className="p-4">
				<div className="grid gap-4 md:grid-cols-4">
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.status")}
						</div>
						<Select
							value={filters.status || "all"}
							onValueChange={(value) => {
								setFilters((prev) => ({
									...prev,
									status: value === "all" ? undefined : value,
								}));
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("expenses.loans.filters.statusAll")}
								</SelectItem>
								<SelectItem value="active">
									{t("expenses.loans.filters.statusActive")}
								</SelectItem>
								<SelectItem value="partial">
									{t("expenses.loans.filters.statusPartial")}
								</SelectItem>
								<SelectItem value="paid">
									{t("expenses.loans.filters.statusPaid")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.loanDateStart")}
						</div>
						<Input
							type="date"
							value={
								filters.loanDateStart
									? format(
											filters.loanDateStart,
											"yyyy-MM-dd",
										)
									: ""
							}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									loanDateStart: e.target.value
										? new Date(e.target.value)
										: undefined,
								}));
							}}
						/>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.loanDateEnd")}
						</div>
						<Input
							type="date"
							value={
								filters.loanDateEnd
									? format(filters.loanDateEnd, "yyyy-MM-dd")
									: ""
							}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									loanDateEnd: e.target.value
										? new Date(e.target.value)
										: undefined,
								}));
							}}
						/>
					</div>

					<div className="flex items-end">
						<Button
							onClick={() => setReportDialogOpen(true)}
							className="w-full"
						>
							<FileTextIcon className="mr-2 size-4" />
							{t("expenses.generateReport")}
						</Button>
					</div>
				</div>

				{/* Account and Team Member Filters */}
				<div className="mt-4 grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.expenseAccounts")}
						</div>
						<div className="flex flex-wrap gap-2">
							{expenseAccounts?.map((account) => (
								<Badge
									key={account.id}
									variant={
										filters.accountIds.includes(account.id)
											? "default"
											: "outline"
									}
									className="cursor-pointer"
									onClick={() =>
										handleAccountToggle(account.id)
									}
								>
									{account.name}
								</Badge>
							))}
						</div>
					</div>
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.teamMembers")}
						</div>
						<div className="flex flex-wrap gap-2">
							{teamMembers.map((member) => (
								<Badge
									key={member.id}
									variant={
										filters.teamMemberIds.includes(
											member.id,
										)
											? "default"
											: "outline"
									}
									className="cursor-pointer"
									onClick={() =>
										handleTeamMemberToggle(member.id)
									}
								>
									{member.name}
								</Badge>
							))}
						</div>
					</div>
				</div>
			</Card>

			{/* Loans Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.loans.table.teamMember")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.loanDate")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.principal")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.remaining")}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.progress")}
							</TableHead>
							<TableHead>
								{t(
									"expenses.loans.consolidated.expenseAccount",
								)}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loans && loans.length > 0 ? (
							loans.map((loan) => {
								const principal = Number(loan.principalAmount);
								const remaining = Number(loan.currentBalance);
								const paid = principal - remaining;
								const progress =
									principal > 0
										? (paid / principal) * 100
										: 0;
								const accountCurrency =
									loan.expenseAccount?.currency || "USD";

								// Calculate original amount from baseCurrencyAmount and conversionRate
								// conversionRate is FROM original currency TO USD
								// So: baseCurrencyAmount = originalAmount / conversionRate
								// Therefore: originalAmount = baseCurrencyAmount * conversionRate
								let originalPrincipal: number | null = null;
								if (
									loan.baseCurrencyAmount &&
									loan.conversionRate
								) {
									originalPrincipal =
										Number(loan.baseCurrencyAmount) *
										Number(loan.conversionRate);
								}

								return (
									<TableRow key={loan.id}>
										<TableCell className="font-medium">
											{loan.teamMember?.name || "-"}
										</TableCell>
										<TableCell>
											{format(
												new Date(loan.loanDate),
												"MMM dd, yyyy",
											)}
										</TableCell>
										<TableCell>
											{originalPrincipal != null &&
											loan.currency !== accountCurrency
												? formatAmountWithOriginal(
														originalPrincipal,
														loan.currency || "USD",
														accountCurrency,
														currencyRates || [],
														loan.baseCurrencyAmount
															? Number(
																	loan.baseCurrencyAmount,
																)
															: null,
														loan.conversionRate
															? Number(
																	loan.conversionRate,
																)
															: null,
													)
												: formatAmountWithOriginal(
														principal,
														accountCurrency,
														accountCurrency,
														currencyRates || [],
														null,
														null,
													)}
										</TableCell>
										<TableCell>
											{originalPrincipal != null &&
											loan.currency !== accountCurrency
												? (() => {
														const remainingRatio =
															remaining /
															principal;
														const originalRemaining =
															originalPrincipal! *
															remainingRatio;
														return formatAmountWithOriginal(
															originalRemaining,
															loan.currency ||
																"USD",
															accountCurrency,
															currencyRates || [],
															loan.baseCurrencyAmount
																? Number(
																		loan.baseCurrencyAmount,
																	) *
																		remainingRatio
																: null,
															loan.conversionRate
																? Number(
																		loan.conversionRate,
																	)
																: null,
														);
													})()
												: formatAmountWithOriginal(
														remaining,
														accountCurrency,
														accountCurrency,
														currencyRates || [],
														null,
														null,
													)}
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<Progress
													value={progress}
													className="w-24"
												/>
												<span className="text-muted-foreground text-xs">
													{progress.toFixed(0)}%
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{loan.expenseAccount?.name ||
													"-"}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													loan.status === "paid"
														? "default"
														: loan.status ===
																"active"
															? "secondary"
															: "outline"
												}
											>
												{loan.status === "paid"
													? t(
															"expenses.loans.status.paid",
														)
													: loan.status === "active"
														? t(
																"expenses.loans.status.active",
															)
														: loan.status ===
																"partial"
															? t(
																	"expenses.loans.status.partial",
																)
															: loan.status}
											</Badge>
										</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.loans.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{reportDialogOpen && (
				<GenerateReportDialog
					open={reportDialogOpen}
					onOpenChange={setReportDialogOpen}
					organizationId={organizationId}
				/>
			)}
		</div>
	);
}

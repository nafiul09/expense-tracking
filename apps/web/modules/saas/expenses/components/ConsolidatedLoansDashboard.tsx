"use client";

import { config } from "@repo/config";
import {
	convertCurrency,
	formatAmountWithOriginal,
	formatCurrency,
} from "@repo/utils";
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
import { Fragment, useMemo, useState } from "react";
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
		loanType: undefined as "given" | "taken" | undefined,
		status: undefined as string | undefined,
		partyName: undefined as string | undefined,
		startDate: undefined as Date | undefined,
		endDate: undefined as Date | undefined,
	});
	const [reportDialogOpen, setReportDialogOpen] = useState(false);

	const { data: loans, isLoading } = useQuery({
		queryKey: ["all-loans", organizationId, filters],
		queryFn: () =>
			expensesApi.loans.listAll({
				organizationId,
				accountIds:
					filters.accountIds.length > 0
						? filters.accountIds
						: undefined,
				loanType: filters.loanType,
				status: filters.status,
				partyName: filters.partyName,
				startDate: filters.startDate,
				endDate: filters.endDate,
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

	// Get unique parties from loans for filter
	const parties = useMemo(() => {
		if (!loans) {
			return [];
		}
		const partySet = new Set<string>();
		loans.forEach((loan) => {
			if (loan.partyName) {
				partySet.add(loan.partyName);
			}
		});
		return Array.from(partySet).sort();
	}, [loans]);

	const summaryStats = useMemo(() => {
		if (!loans) {
			return {
				totalActive: 0,
				totalOutstanding: 0,
				totalPaid: 0,
				outstandingBreakdown: [],
				paidBreakdown: [],
			};
		}

		const isAllAccounts = filters.accountIds.length === 0;
		const activeLoans = loans.filter(
			(l) => l.status === "active" || l.status === "partial",
		);

		if (isAllAccounts && expenseAccounts) {
			// Calculate per-account breakdown
			const outstandingByAccount = new Map<
				string,
				{ accountName: string; currency: string; total: number }
			>();
			const paidByAccount = new Map<
				string,
				{ accountName: string; currency: string; total: number }
			>();

			for (const account of expenseAccounts) {
				outstandingByAccount.set(account.id, {
					accountName: account.name,
					currency: account.currency,
					total: 0,
				});
				paidByAccount.set(account.id, {
					accountName: account.name,
					currency: account.currency,
					total: 0,
				});
			}

			for (const loan of activeLoans) {
				const accountId = loan.expenseAccountId;
				const outstanding = Number(loan.currentBalance);
				const existing = outstandingByAccount.get(accountId);
				if (existing) {
					existing.total += outstanding;
				}
			}

			for (const loan of loans) {
				const accountId = loan.expenseAccountId;
				const principal = Number(loan.principalAmount);
				const remaining = Number(loan.currentBalance);
				const paid = principal - remaining;
				const existing = paidByAccount.get(accountId);
				if (existing) {
					existing.total += paid;
				}
			}

			const outstandingBreakdown = Array.from(
				outstandingByAccount.values(),
			).filter((b) => b.total > 0);
			const paidBreakdown = Array.from(paidByAccount.values()).filter(
				(b) => b.total > 0,
			);

			return {
				totalActive: activeLoans.length,
				totalOutstanding: 0,
				totalPaid: 0,
				outstandingBreakdown,
				paidBreakdown,
			};
		}
		// Calculate totals for selected accounts in their currency
		let totalOutstanding = 0;
		let totalPaid = 0;
		const selectedAccount = expenseAccounts?.find((a) =>
			filters.accountIds.includes(a.id),
		);
		const accountCurrency = selectedAccount?.currency || "USD";

		for (const loan of activeLoans) {
			if (
				filters.accountIds.length === 0 ||
				filters.accountIds.includes(loan.expenseAccountId)
			) {
				const loanCurrency = loan.expenseAccount?.currency || "USD";
				const outstanding = Number(loan.currentBalance);
				if (loanCurrency === accountCurrency) {
					totalOutstanding += outstanding;
				} else {
					try {
						const converted = convertCurrency(
							outstanding,
							loanCurrency,
							accountCurrency,
							currencyRates || [],
						);
						totalOutstanding += converted;
					} catch {
						totalOutstanding += outstanding;
					}
				}
			}
		}

		for (const loan of loans) {
			if (
				filters.accountIds.length === 0 ||
				filters.accountIds.includes(loan.expenseAccountId)
			) {
				const loanCurrency = loan.expenseAccount?.currency || "USD";
				const principal = Number(loan.principalAmount);
				const remaining = Number(loan.currentBalance);
				const paid = principal - remaining;
				if (loanCurrency === accountCurrency) {
					totalPaid += paid;
				} else {
					try {
						const converted = convertCurrency(
							paid,
							loanCurrency,
							accountCurrency,
							currencyRates || [],
						);
						totalPaid += converted;
					} catch {
						totalPaid += paid;
					}
				}
			}
		}

		return {
			totalActive: activeLoans.length,
			totalOutstanding,
			totalPaid,
			outstandingBreakdown: [],
			paidBreakdown: [],
		};
	}, [loans, filters.accountIds, expenseAccounts, currencyRates]);

	const isAllAccountsView = filters.accountIds.length === 0;

	const handleAccountToggle = (accountId: string) => {
		setFilters((prev) => ({
			...prev,
			accountIds: prev.accountIds.includes(accountId)
				? prev.accountIds.filter((id) => id !== accountId)
				: [...prev.accountIds, accountId],
		}));
	};

	const handleLoanTypeChange = (loanType: "given" | "taken" | "all") => {
		setFilters((prev) => ({
			...prev,
			loanType: loanType === "all" ? undefined : loanType,
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
						<div className="w-full">
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.loans.consolidated.totalOutstanding",
								)}
							</p>
							{isAllAccountsView &&
							summaryStats.outstandingBreakdown &&
							summaryStats.outstandingBreakdown.length > 0 ? (
								<div className="space-y-2 mt-2">
									{summaryStats.outstandingBreakdown.map(
										(breakdown, idx) => (
											<div
												key={idx}
												className="flex justify-between items-center"
											>
												<span className="text-sm font-medium">
													{breakdown.accountName}
												</span>
												<span className="text-lg font-bold">
													{formatCurrency(
														breakdown.total,
														breakdown.currency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																breakdown.currency,
														),
													)}
												</span>
											</div>
										),
									)}
								</div>
							) : (
								<p className="text-2xl font-bold">
									{(() => {
										const selectedAccount =
											expenseAccounts?.find((a) =>
												filters.accountIds.includes(
													a.id,
												),
											);
										const accountCurrency =
											selectedAccount?.currency ||
											config.expenses.defaultBaseCurrency;
										return formatCurrency(
											summaryStats.totalOutstanding,
											accountCurrency,
											currencyRates?.find(
												(r) =>
													r.toCurrency ===
													accountCurrency,
											),
										);
									})()}
								</p>
							)}
						</div>
						<FileTextIcon className="text-muted-foreground size-8 ml-4 flex-shrink-0" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div className="w-full">
							<p className="text-muted-foreground text-sm">
								{t("expenses.loans.consolidated.totalPaid")}
							</p>
							{isAllAccountsView &&
							summaryStats.paidBreakdown &&
							summaryStats.paidBreakdown.length > 0 ? (
								<div className="space-y-2 mt-2">
									{summaryStats.paidBreakdown.map(
										(breakdown, idx) => (
											<div
												key={idx}
												className="flex justify-between items-center"
											>
												<span className="text-sm font-medium">
													{breakdown.accountName}
												</span>
												<span className="text-lg font-bold">
													{formatCurrency(
														breakdown.total,
														breakdown.currency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																breakdown.currency,
														),
													)}
												</span>
											</div>
										),
									)}
								</div>
							) : (
								<p className="text-2xl font-bold">
									{(() => {
										const selectedAccount =
											expenseAccounts?.find((a) =>
												filters.accountIds.includes(
													a.id,
												),
											);
										const accountCurrency =
											selectedAccount?.currency ||
											config.expenses.defaultBaseCurrency;
										return formatCurrency(
											summaryStats.totalPaid,
											accountCurrency,
											currencyRates?.find(
												(r) =>
													r.toCurrency ===
													accountCurrency,
											),
										);
									})()}
								</p>
							)}
						</div>
						<PlusIcon className="text-muted-foreground size-8 ml-4 flex-shrink-0" />
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
							{t("expenses.loans.filters.startDate") ||
								"Start Date"}
						</div>
						<Input
							type="date"
							value={
								filters.startDate
									? format(filters.startDate, "yyyy-MM-dd")
									: ""
							}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									startDate: e.target.value
										? new Date(e.target.value)
										: undefined,
								}));
							}}
						/>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.endDate") || "End Date"}
						</div>
						<Input
							type="date"
							value={
								filters.endDate
									? format(filters.endDate, "yyyy-MM-dd")
									: ""
							}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									endDate: e.target.value
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
							{t("expenses.loans.filters.loanType") ||
								"Loan Type"}
						</div>
						<Select
							value={filters.loanType || "all"}
							onValueChange={(value) =>
								handleLoanTypeChange(
									value as "given" | "taken" | "all",
								)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("expenses.loans.filters.allTypes") ||
										"All Types"}
								</SelectItem>
								<SelectItem value="given">
									{t("loans.form.loanGiven") || "Given"}
								</SelectItem>
								<SelectItem value="taken">
									{t("loans.form.loanTaken") || "Taken"}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.loans.filters.partyName") ||
								"Party Name"}
						</div>
						<Input
							placeholder={
								t("expenses.loans.filters.searchParty") ||
								"Search party..."
							}
							value={filters.partyName || ""}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									partyName: e.target.value || undefined,
								}));
							}}
						/>
					</div>
				</div>
			</Card>

			{/* Loans Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.loans.table.loanType") || "Type"}
							</TableHead>
							<TableHead>
								{t("expenses.loans.table.partyName") || "Party"}
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
							(() => {
								if (isAllAccountsView && expenseAccounts) {
									// Group loans by account
									const loansByAccount = new Map<
										string,
										typeof loans
									>();

									for (const loan of loans) {
										const accountId = loan.expenseAccountId;
										if (!loansByAccount.has(accountId)) {
											loansByAccount.set(accountId, []);
										}
										loansByAccount
											.get(accountId)!
											.push(loan);
									}

									return Array.from(
										loansByAccount.entries(),
									).map(([accountId, accountLoans]) => {
										const account = expenseAccounts.find(
											(a) => a.id === accountId,
										);
										if (!account) return null;

										// Calculate subtotals for this account
										const activeLoans = accountLoans.filter(
											(l) =>
												l.status === "active" ||
												l.status === "partial",
										);
										let outstandingSubtotal = 0;
										let paidSubtotal = 0;

										for (const loan of activeLoans) {
											outstandingSubtotal += Number(
												loan.currentBalance,
											);
										}

										for (const loan of accountLoans) {
											const principal = Number(
												loan.principalAmount,
											);
											const remaining = Number(
												loan.currentBalance,
											);
											paidSubtotal +=
												principal - remaining;
										}

										return (
											<Fragment key={accountId}>
												<TableRow className="bg-muted/50">
													<TableCell
														colSpan={8}
														className="font-semibold"
													>
														{account.name} -{" "}
														{account.currency}
													</TableCell>
												</TableRow>
												{accountLoans.map((loan) => {
													const principal = Number(
														loan.principalAmount,
													);
													const remaining = Number(
														loan.currentBalance,
													);
													const paid =
														principal - remaining;
													const progress =
														principal > 0
															? (paid /
																	principal) *
																100
															: 0;
													const accountCurrency =
														loan.expenseAccount
															?.currency || "USD";

													let originalPrincipal:
														| number
														| null = null;
													if (
														loan.baseCurrencyAmount &&
														loan.conversionRate
													) {
														originalPrincipal =
															Number(
																loan.baseCurrencyAmount,
															) *
															Number(
																loan.conversionRate,
															);
													}

													return (
														<TableRow key={loan.id}>
															<TableCell>
																<Badge
																	variant={
																		loan.loanType ===
																		"given"
																			? "default"
																			: "secondary"
																	}
																>
																	{loan.loanType ===
																	"given"
																		? t(
																				"loans.form.loanGiven",
																			) ||
																			"Given"
																		: t(
																				"loans.form.loanTaken",
																			) ||
																			"Taken"}
																</Badge>
															</TableCell>
															<TableCell className="font-medium">
																{loan.partyName}
															</TableCell>
															<TableCell>
																{format(
																	new Date(
																		loan.loanDate,
																	),
																	"MMM dd, yyyy",
																)}
															</TableCell>
															<TableCell>
																{originalPrincipal !=
																	null &&
																loan.currency !==
																	accountCurrency
																	? formatAmountWithOriginal(
																			originalPrincipal,
																			loan.currency ||
																				"USD",
																			accountCurrency,
																			currencyRates ||
																				[],
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
																			currencyRates ||
																				[],
																			null,
																			null,
																		)}
															</TableCell>
															<TableCell>
																{originalPrincipal !=
																	null &&
																loan.currency !==
																	accountCurrency
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
																				currencyRates ||
																					[],
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
																			currencyRates ||
																				[],
																			null,
																			null,
																		)}
															</TableCell>
															<TableCell>
																<div className="space-y-1">
																	<Progress
																		value={
																			progress
																		}
																		className="w-24"
																	/>
																	<span className="text-muted-foreground text-xs">
																		{progress.toFixed(
																			0,
																		)}
																		%
																	</span>
																</div>
															</TableCell>
															<TableCell>
																<Badge variant="secondary">
																	{loan
																		.expenseAccount
																		?.name ||
																		"-"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge
																	variant={
																		loan.status ===
																		"paid"
																			? "default"
																			: loan.status ===
																					"active"
																				? "secondary"
																				: "outline"
																	}
																>
																	{loan.status ===
																	"paid"
																		? t(
																				"expenses.loans.status.paid",
																			)
																		: loan.status ===
																				"active"
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
												})}
												<TableRow className="border-b-2">
													<TableCell
														colSpan={3}
														className="text-right font-medium"
													>
														{t(
															"expenses.consolidated.subtotal",
														)}
														:
													</TableCell>
													<TableCell className="font-bold">
														{formatCurrency(
															outstandingSubtotal,
															account.currency,
															currencyRates?.find(
																(r) =>
																	r.toCurrency ===
																	account.currency,
															),
														)}
													</TableCell>
													<TableCell className="font-bold">
														{formatCurrency(
															paidSubtotal,
															account.currency,
															currencyRates?.find(
																(r) =>
																	r.toCurrency ===
																	account.currency,
															),
														)}
													</TableCell>
													<TableCell colSpan={3} />
												</TableRow>
											</Fragment>
										);
									});
								}

								// Flat table for specific account selection
								return loans.map((loan) => {
									const principal = Number(
										loan.principalAmount,
									);
									const remaining = Number(
										loan.currentBalance,
									);
									const paid = principal - remaining;
									const progress =
										principal > 0
											? (paid / principal) * 100
											: 0;
									const accountCurrency =
										loan.expenseAccount?.currency || "USD";

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
											<TableCell>
												<Badge
													variant={
														loan.loanType ===
														"given"
															? "default"
															: "secondary"
													}
												>
													{loan.loanType === "given"
														? t(
																"loans.form.loanGiven",
															) || "Given"
														: t(
																"loans.form.loanTaken",
															) || "Taken"}
												</Badge>
											</TableCell>
											<TableCell className="font-medium">
												{loan.partyName}
											</TableCell>
											<TableCell>
												{format(
													new Date(loan.loanDate),
													"MMM dd, yyyy",
												)}
											</TableCell>
											<TableCell>
												{originalPrincipal != null &&
												loan.currency !==
													accountCurrency
													? formatAmountWithOriginal(
															originalPrincipal,
															loan.currency ||
																"USD",
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
												loan.currency !==
													accountCurrency
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
																currencyRates ||
																	[],
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
													{loan.expenseAccount
														?.name || "-"}
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
														: loan.status ===
																"active"
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
								});
							})()
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

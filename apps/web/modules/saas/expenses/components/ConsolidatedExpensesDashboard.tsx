"use client";

import { config } from "@repo/config";
import {
	convertCurrency,
	formatAmountWithOriginal,
	formatCurrency,
} from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { calculateSummaryStats } from "@saas/expenses/lib/currency-summary";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Input } from "@ui/components/input";
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
import { format, subDays } from "date-fns";
import { CalendarIcon, EditIcon, FileTextIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface ConsolidatedExpensesDashboardProps {
	organizationId: string;
}

export default function ConsolidatedExpensesDashboard({
	organizationId,
}: ConsolidatedExpensesDashboardProps) {
	const t = useTranslations();
	const [filters, setFilters] = useState({
		startDate: subDays(new Date(), 30) as Date | undefined,
		endDate: new Date() as Date | undefined,
		accountIds: [] as string[],
		expenseType: undefined as
			| "subscription"
			| "team_salary"
			| "one_time"
			| undefined,
		search: "",
	});
	const [editingExpenseId, setEditingExpenseId] = useState<string | null>(
		null,
	);
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
		null,
	);
	const [reportDialogOpen, setReportDialogOpen] = useState(false);
	const [page, setPage] = useState(0);
	const limit = 50;

	// Fetch expenses
	const { data: expensesData, isLoading } = useQuery({
		queryKey: ["all-expenses", organizationId, filters, page],
		queryFn: () =>
			expensesApi.expenses.listAll({
				organizationId,
				...filters,
				startDate: filters.startDate,
				endDate: filters.endDate,
				limit,
				offset: page * limit,
			}),
	});

	// Fetch expense accounts for filter
	const { data: expenseAccounts } = useQuery({
		queryKey: ["expenseAccounts", organizationId],
		queryFn: () => expensesApi.expenseAccounts.list(organizationId),
	});

	// Fetch currency rates
	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", organizationId],
		queryFn: () => expensesApi.currencies.list(organizationId),
	});

	// Calculate summary stats
	const summaryStats = useMemo(() => {
		if (!expensesData?.expenses) {
			return {
				last30Days: 0,
				currentMonth: 0,
				totalCount: 0,
			};
		}

		return calculateSummaryStats(
			expensesData.expenses.map((e) => ({
				...e,
				amount: Number(e.amount),
				baseCurrencyAmount: e.baseCurrencyAmount
					? Number(e.baseCurrencyAmount)
					: null,
				conversionRate: e.conversionRate
					? Number(e.conversionRate)
					: null,
			})),
			expenseAccounts || [],
			filters.accountIds,
			currencyRates || [],
		);
	}, [expensesData, expenseAccounts, filters.accountIds, currencyRates]);

	const isAllAccountsView = filters.accountIds.length === 0;

	const handleAccountToggle = (accountId: string) => {
		setFilters((prev) => ({
			...prev,
			accountIds: prev.accountIds.includes(accountId)
				? prev.accountIds.filter((id) => id !== accountId)
				: [...prev.accountIds, accountId],
		}));
		setPage(0);
	};

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div className="w-full">
							<p className="text-muted-foreground text-sm">
								{t("expenses.consolidated.last30Days")}
							</p>
							{isAllAccountsView &&
							summaryStats.last30DaysBreakdown &&
							summaryStats.last30DaysBreakdown.length > 0 ? (
								<div className="space-y-2 mt-2">
									{summaryStats.last30DaysBreakdown.map(
										(breakdown) => (
											<div
												key={breakdown.accountId}
												className="flex justify-between items-center"
											>
												<span className="text-sm font-medium">
													{breakdown.accountName}
												</span>
												<span className="text-lg font-bold">
													{formatCurrency(
														breakdown.amount,
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
										// Get the currency from the selected account(s)
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
											summaryStats.last30Days,
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
						<CalendarIcon className="text-muted-foreground size-8 ml-4 flex-shrink-0" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div className="w-full">
							<p className="text-muted-foreground text-sm">
								{t("expenses.consolidated.currentMonth")}
							</p>
							{isAllAccountsView &&
							summaryStats.currentMonthBreakdown &&
							summaryStats.currentMonthBreakdown.length > 0 ? (
								<div className="space-y-2 mt-2">
									{summaryStats.currentMonthBreakdown.map(
										(breakdown) => (
											<div
												key={breakdown.accountId}
												className="flex justify-between items-center"
											>
												<span className="text-sm font-medium">
													{breakdown.accountName}
												</span>
												<span className="text-lg font-bold">
													{formatCurrency(
														breakdown.amount,
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
										// Get the currency from the selected account(s)
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
											summaryStats.currentMonth,
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
			</div>

			{/* Filters */}
			<Card className="p-4">
				<div className="grid gap-4 md:grid-cols-3">
					{/* Search */}
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.search")}
						</div>
						<Input
							placeholder={t(
								"expenses.filters.searchPlaceholder",
							)}
							value={filters.search}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									search: e.target.value,
								}));
								setPage(0);
							}}
						/>
					</div>

					{/* Expense Type Filter */}
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.expenseType") ||
								"Expense Type"}
						</div>
						<Select
							value={filters.expenseType || "all"}
							onValueChange={(value) => {
								setFilters((prev) => ({
									...prev,
									expenseType:
										value === "all"
											? undefined
											: (value as
													| "subscription"
													| "team_salary"
													| "one_time"),
								}));
								setPage(0);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("expenses.filters.expenseTypeAll") ||
										"All Types"}
								</SelectItem>
								<SelectItem value="subscription">
									{t("expenses.expenseType.subscription") ||
										"Subscription"}
								</SelectItem>
								<SelectItem value="team_salary">
									{t("expenses.expenseType.teamSalary") ||
										"Team Salary"}
								</SelectItem>
								<SelectItem value="one_time">
									{t("expenses.expenseType.oneTime") ||
										"One Time"}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Date Range and Generate Report */}
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.dateRange") || "Date Range"}
						</div>
						<div className="flex flex-col sm:flex-row gap-2">
							<div className="flex flex-1 gap-2 min-w-0">
								<Input
									type="date"
									className="flex-1 min-w-0"
									value={
										filters.startDate
											? format(
													filters.startDate,
													"yyyy-MM-dd",
												)
											: ""
									}
									onChange={(e) => {
										setFilters((prev) => ({
											...prev,
											startDate: e.target.value
												? new Date(e.target.value)
												: undefined,
										}));
										setPage(0);
									}}
								/>
								<span className="self-center text-muted-foreground shrink-0 px-1">
									-
								</span>
								<Input
									type="date"
									className="flex-1 min-w-0"
									value={
										filters.endDate
											? format(
													filters.endDate,
													"yyyy-MM-dd",
												)
											: ""
									}
									onChange={(e) => {
										setFilters((prev) => ({
											...prev,
											endDate: e.target.value
												? new Date(e.target.value)
												: undefined,
										}));
										setPage(0);
									}}
								/>
							</div>
							<Button
								onClick={() => setReportDialogOpen(true)}
								className="whitespace-nowrap shrink-0 w-full sm:w-auto sm:min-w-fit"
							>
								<FileTextIcon className="mr-2 size-4" />
								{t("expenses.generateReport")}
							</Button>
						</div>
					</div>
				</div>

				{/* Account Filters */}
				<div className="mt-4">
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.expenseAccounts")}
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
				</div>
			</Card>

			{/* Expenses Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("expenses.table.date")}</TableHead>
							<TableHead>{t("expenses.table.title")}</TableHead>
							<TableHead>{t("expenses.table.amount")}</TableHead>
							<TableHead>
								{t("expenses.consolidated.expenseAccount")}
							</TableHead>
							<TableHead>
								{t("expenses.table.teamMember")}
							</TableHead>
							<TableHead>{t("expenses.table.status")}</TableHead>
							<TableHead>{t("expenses.table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{expensesData?.expenses &&
						expensesData.expenses.length > 0 ? (
							(() => {
								// Group expenses by account when "All Accounts" is selected
								if (isAllAccountsView) {
									const groupedExpenses = new Map<
										string,
										typeof expensesData.expenses
									>();

									for (const expense of expensesData.expenses) {
										const accountId = expense.businessId;
										if (!groupedExpenses.has(accountId)) {
											groupedExpenses.set(accountId, []);
										}
										const accountGroup =
											groupedExpenses.get(accountId);
										if (accountGroup) {
											accountGroup.push(expense);
										}
									}

									return Array.from(
										groupedExpenses.entries(),
									).map(([accountId, accountExpenses]) => {
										const account = expenseAccounts?.find(
											(a) => a.id === accountId,
										);
										const accountCurrency =
											account?.currency ||
											config.expenses.defaultBaseCurrency;
										const subtotal = accountExpenses.reduce(
											(sum, e) => {
												// Get amount in account's native currency
												// Use baseCurrencyAmount if available, otherwise convert from expense currency
												let amountInAccountCurrency: number;

												if (
													e.baseCurrencyAmount != null
												) {
													// Convert from USD to account currency
													const baseAmount = Number(
														e.baseCurrencyAmount,
													);
													if (
														accountCurrency ===
														config.expenses
															.defaultBaseCurrency
													) {
														amountInAccountCurrency =
															baseAmount;
													} else {
														try {
															amountInAccountCurrency =
																convertCurrency(
																	baseAmount,
																	config
																		.expenses
																		.defaultBaseCurrency,
																	accountCurrency,
																	currencyRates ||
																		[],
																);
														} catch {
															// Fallback to original amount if conversion fails
															amountInAccountCurrency =
																Number(
																	e.amount,
																);
														}
													}
												} else {
													// Use expense amount directly (should already be in account currency)
													amountInAccountCurrency =
														Number(e.amount);
												}

												return (
													sum +
													amountInAccountCurrency
												);
											},
											0,
										);

										return (
											<Fragment key={accountId}>
												<TableRow className="bg-muted/50">
													<TableCell
														colSpan={7}
														className="font-semibold"
													>
														{account?.name ||
															"Unknown Account"}{" "}
														-{" "}
														{account?.currency ||
															"USD"}
													</TableCell>
												</TableRow>
												{accountExpenses.map(
													(expense) => (
														<TableRow
															key={expense.id}
														>
															<TableCell>
																{expense.salaryMonth
																	? (() => {
																			const [
																				year,
																				month,
																			] =
																				expense.salaryMonth.split(
																					"-",
																				);
																			const date =
																				new Date(
																					Number(
																						year,
																					),
																					Number(
																						month,
																					) -
																						1,
																				);
																			return format(
																				date,
																				"MMMM yyyy",
																			);
																		})()
																	: format(
																			new Date(
																				expense.date,
																			),
																			"MMM dd, yyyy",
																		)}
															</TableCell>
															<TableCell className="font-medium">
																{expense.title}
															</TableCell>
															<TableCell>
																{formatAmountWithOriginal(
																	Number(
																		expense.amount,
																	),
																	expense.currency ||
																		expense
																			.expenseAccount
																			?.currency ||
																		"USD",
																	expense
																		.expenseAccount
																		?.currency ||
																		"USD",
																	currencyRates ||
																		[],
																	expense.baseCurrencyAmount
																		? Number(
																				expense.baseCurrencyAmount,
																			)
																		: null,
																	expense.conversionRate
																		? Number(
																				expense.conversionRate,
																			)
																		: null,
																)}
															</TableCell>
															<TableCell>
																<Badge variant="secondary">
																	{expense
																		.expenseAccount
																		?.name ||
																		"-"}
																</Badge>
															</TableCell>
															<TableCell>
																{expense
																	.teamMember
																	?.name ||
																	"-"}
															</TableCell>
															<TableCell>
																<Badge
																	variant={
																		expense.status ===
																		"active"
																			? "default"
																			: "secondary"
																	}
																>
																	{expense.status ===
																	"active"
																		? t(
																				"expenses.status.active",
																			)
																		: expense.status ===
																				"cancelled"
																			? t(
																					"expenses.status.cancelled",
																				)
																			: expense.status}
																</Badge>
															</TableCell>
															<TableCell>
																<div className="flex gap-2">
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			setEditingExpenseId(
																				expense.id,
																			)
																		}
																	>
																		<EditIcon className="size-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			setDeletingExpenseId(
																				expense.id,
																			)
																		}
																	>
																		<TrashIcon className="size-4" />
																	</Button>
																</div>
															</TableCell>
														</TableRow>
													),
												)}
												<TableRow className="border-b-2">
													<TableCell
														colSpan={2}
														className="text-right font-medium"
													>
														{t(
															"expenses.consolidated.subtotal",
														)}
														:
													</TableCell>
													<TableCell className="font-bold">
														{formatCurrency(
															subtotal,
															account?.currency ||
																"USD",
															currencyRates?.find(
																(r) =>
																	r.toCurrency ===
																	(account?.currency ||
																		"USD"),
															),
														)}
													</TableCell>
													<TableCell colSpan={4} />
												</TableRow>
											</Fragment>
										);
									});
								}

								// Flat table for specific account selection
								return expensesData.expenses.map((expense) => (
									<TableRow key={expense.id}>
										<TableCell>
											{expense.salaryMonth
												? (() => {
														const [year, month] =
															expense.salaryMonth.split(
																"-",
															);
														const date = new Date(
															Number(year),
															Number(month) - 1,
														);
														return format(
															date,
															"MMMM yyyy",
														);
													})()
												: format(
														new Date(expense.date),
														"MMM dd, yyyy",
													)}
										</TableCell>
										<TableCell className="font-medium">
											{expense.title}
										</TableCell>
										<TableCell>
											{formatAmountWithOriginal(
												Number(expense.amount),
												expense.currency ||
													expense.expenseAccount
														?.currency ||
													"USD",
												expense.expenseAccount
													?.currency || "USD",
												currencyRates || [],
												expense.baseCurrencyAmount
													? Number(
															expense.baseCurrencyAmount,
														)
													: null,
												expense.conversionRate
													? Number(
															expense.conversionRate,
														)
													: null,
											)}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{expense.expenseAccount?.name ||
													"-"}
											</Badge>
										</TableCell>
										<TableCell>
											{expense.teamMember?.name || "-"}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													expense.status === "active"
														? "default"
														: "secondary"
												}
											>
												{expense.status === "active"
													? t(
															"expenses.status.active",
														)
													: expense.status ===
															"cancelled"
														? t(
																"expenses.status.cancelled",
															)
														: expense.status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setEditingExpenseId(
															expense.id,
														)
													}
												>
													<EditIcon className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setDeletingExpenseId(
															expense.id,
														)
													}
												>
													<TrashIcon className="size-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								));
							})()
						) : (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{/* Pagination */}
			{expensesData && expensesData.total > limit && (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm">
						{t("common.showing", {
							start: page * limit + 1,
							end: Math.min(
								(page + 1) * limit,
								expensesData.total,
							),
							total: expensesData.total,
						})}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							disabled={page === 0}
							onClick={() => setPage((p) => p - 1)}
						>
							{t("common.previous")}
						</Button>
						<Button
							variant="outline"
							disabled={(page + 1) * limit >= expensesData.total}
							onClick={() => setPage((p) => p + 1)}
						>
							{t("common.next")}
						</Button>
					</div>
				</div>
			)}

			{/* Dialogs */}
			{editingExpenseId && (
				<EditExpenseDialog
					open={!!editingExpenseId}
					onOpenChange={(open) => !open && setEditingExpenseId(null)}
					expenseId={editingExpenseId}
					businessId={
						expensesData?.expenses.find(
							(e) => e.id === editingExpenseId,
						)?.businessId || ""
					}
				/>
			)}

			{deletingExpenseId && (
				<DeleteExpenseDialog
					open={!!deletingExpenseId}
					onOpenChange={(open) => !open && setDeletingExpenseId(null)}
					expenseId={deletingExpenseId}
					businessId={
						expensesData?.expenses.find(
							(e) => e.id === deletingExpenseId,
						)?.businessId || ""
					}
				/>
			)}

			{reportDialogOpen && (
				<GenerateReportDialog
					open={reportDialogOpen}
					onOpenChange={setReportDialogOpen}
					organizationId={organizationId}
					defaultFilters={filters}
				/>
			)}
		</div>
	);
}

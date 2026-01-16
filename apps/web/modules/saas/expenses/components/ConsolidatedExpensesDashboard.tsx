"use client";

import { config } from "@repo/config";
import { formatAmountWithOriginal, formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
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
import {
	CalendarIcon,
	EditIcon,
	FileTextIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
		status: undefined as string | undefined,
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

		const now = new Date();
		const last30DaysStart = subDays(now, 30);
		const currentMonthStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			1,
		);

		const last30DaysTotal = expensesData.expenses
			.filter((e) => {
				const expenseDate = new Date(e.date);
				return expenseDate >= last30DaysStart && expenseDate <= now;
			})
			.reduce((sum, e) => sum + Number(e.amount), 0);

		const currentMonthTotal = expensesData.expenses
			.filter((e) => {
				const expenseDate = new Date(e.date);
				return expenseDate >= currentMonthStart && expenseDate <= now;
			})
			.reduce((sum, e) => sum + Number(e.amount), 0);

		return {
			last30Days: last30DaysTotal,
			currentMonth: currentMonthTotal,
			totalCount: expensesData.total,
		};
	}, [expensesData]);

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
			<div className="grid gap-4 md:grid-cols-3">
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t("expenses.consolidated.last30Days")}
							</p>
							<p className="text-2xl font-bold">
								{formatCurrency(
									summaryStats.last30Days,
									config.expenses.defaultBaseCurrency,
									currencyRates?.find(
										(r) =>
											r.toCurrency ===
											config.expenses.defaultBaseCurrency,
									),
								)}
							</p>
						</div>
						<CalendarIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t("expenses.consolidated.currentMonth")}
							</p>
							<p className="text-2xl font-bold">
								{formatCurrency(
									summaryStats.currentMonth,
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
								{t("expenses.consolidated.totalExpenses")}
							</p>
							<p className="text-2xl font-bold">
								{summaryStats.totalCount}
							</p>
						</div>
						<PlusIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
			</div>

			{/* Filters */}
			<Card className="p-4">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
					{/* Date Range */}
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.startDate")}
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
								setPage(0);
							}}
						/>
					</div>
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.endDate")}
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
								setPage(0);
							}}
						/>
					</div>

					{/* Status Filter */}
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.filters.status")}
						</div>
						<Select
							value={filters.status || "all"}
							onValueChange={(value) => {
								setFilters((prev) => ({
									...prev,
									status: value === "all" ? undefined : value,
								}));
								setPage(0);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("expenses.filters.statusAll")}
								</SelectItem>
								<SelectItem value="active">
									{t("expenses.filters.statusActive")}
								</SelectItem>
								<SelectItem value="cancelled">
									{t("expenses.filters.statusCancelled")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

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

					{/* Generate Report Button */}
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
							expensesData.expenses.map((expense) => (
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
											expense.expenseAccount?.currency ||
												"USD",
											currencyRates || [],
											expense.baseCurrencyAmount
												? Number(
														expense.baseCurrencyAmount,
													)
												: null,
											expense.conversionRate
												? Number(expense.conversionRate)
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
												? t("expenses.status.active")
												: expense.status === "cancelled"
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
							))
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

"use client";

import { config } from "@repo/config";
import { formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
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
import {
	FileTextIcon,
	MoreVerticalIcon,
	PlusIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CreateTeamMemberDialog } from "./CreateTeamMemberDialog";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface ConsolidatedTeamMembersDashboardProps {
	organizationId: string;
}

export default function ConsolidatedTeamMembersDashboard({
	organizationId,
}: ConsolidatedTeamMembersDashboardProps) {
	const t = useTranslations();
	const [filters, setFilters] = useState({
		accountIds: [] as string[],
		status: undefined as string | undefined,
		search: "",
	});
	const [reportDialogOpen, setReportDialogOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	const { data: teamMembers, isLoading } = useQuery({
		queryKey: ["all-team-members", organizationId, filters],
		queryFn: () =>
			expensesApi.teamMembers.listAll({
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

	const summaryStats = useMemo(() => {
		if (!teamMembers) {
			return {
				totalMembers: 0,
				totalMonthlySalaries: 0,
			};
		}

		const activeMembers = teamMembers.filter((m) => m.status === "active");
		const totalMonthlySalaries = activeMembers.reduce((sum, member) => {
			// Sum salaries from all account associations
			const accountSalaries =
				member.accounts?.reduce(
					(accSum, acc) => accSum + (Number(acc.salary) || 0),
					0,
				) || 0;
			// Also include legacy salary if exists
			const legacySalary = Number(member.salary) || 0;
			return sum + accountSalaries + legacySalary;
		}, 0);

		return {
			totalMembers: teamMembers.length,
			totalMonthlySalaries,
		};
	}, [teamMembers]);

	const handleAccountToggle = (accountId: string) => {
		setFilters((prev) => ({
			...prev,
			accountIds: prev.accountIds.includes(accountId)
				? prev.accountIds.filter((id) => id !== accountId)
				: [...prev.accountIds, accountId],
		}));
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
						<div>
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.teamMembers.consolidated.totalMembers",
								)}
							</p>
							<p className="text-2xl font-bold">
								{summaryStats.totalMembers}
							</p>
						</div>
						<UsersIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.teamMembers.consolidated.totalMonthlySalaries",
								)}
							</p>
							<p className="text-2xl font-bold">
								{formatCurrency(
									summaryStats.totalMonthlySalaries,
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
			</div>

			{/* Filters and Actions */}
			<Card className="p-4">
				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.teamMembers.filters.status")}
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
									{t(
										"expenses.teamMembers.filters.statusAll",
									)}
								</SelectItem>
								<SelectItem value="active">
									{t(
										"expenses.teamMembers.filters.statusActive",
									)}
								</SelectItem>
								<SelectItem value="inactive">
									{t(
										"expenses.teamMembers.filters.statusInactive",
									)}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.teamMembers.filters.search")}
						</div>
						<Input
							placeholder={t(
								"expenses.teamMembers.filters.searchPlaceholder",
							)}
							value={filters.search}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									search: e.target.value,
								}));
							}}
						/>
					</div>

					<div className="flex items-end gap-2">
						<Button
							onClick={() => setCreateDialogOpen(true)}
							className="flex-1"
						>
							<PlusIcon className="mr-2 size-4" />
							{t("expenses.teamMembers.create")}
						</Button>
						<Button
							variant="outline"
							onClick={() => setReportDialogOpen(true)}
						>
							<FileTextIcon className="mr-2 size-4" />
							{t("expenses.generateReport")}
						</Button>
					</div>
				</div>

				{/* Account Filters */}
				<div className="mt-4 space-y-2">
					<div className="text-sm font-medium">
						{t("expenses.teamMembers.filters.expenseAccounts")}
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
								onClick={() => handleAccountToggle(account.id)}
							>
								{account.name}
							</Badge>
						))}
					</div>
				</div>
			</Card>

			{/* Team Members Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.teamMembers.table.name")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.email")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.position")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.salary")}
							</TableHead>
							<TableHead>
								{t(
									"expenses.teamMembers.consolidated.connectedAccounts",
								)}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.status")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamMembers && teamMembers.length > 0 ? (
							teamMembers.map((member) => {
								const connectedAccountsCount =
									member.accounts?.length || 0;
								const accountNames =
									member.accounts
										?.map((acc) => acc.account.name)
										.join(", ") || "";

								return (
									<TableRow key={member.id}>
										<TableCell className="font-medium">
											{member.name}
										</TableCell>
										<TableCell>
											{member.email || "-"}
										</TableCell>
										<TableCell>
											{member.accounts?.[0]?.position ||
												member.position ||
												"-"}
										</TableCell>
										<TableCell>
											{member.accounts?.[0]?.salary
												? formatCurrency(
														Number(
															member.accounts[0]
																.salary,
														),
														config.expenses
															.defaultBaseCurrency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																config.expenses
																	.defaultBaseCurrency,
														),
													)
												: member.salary
													? formatCurrency(
															Number(
																member.salary,
															),
															config.expenses
																.defaultBaseCurrency,
															currencyRates?.find(
																(r) =>
																	r.toCurrency ===
																	config
																		.expenses
																		.defaultBaseCurrency,
															),
														)
													: "-"}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Badge variant="outline">
													{connectedAccountsCount}{" "}
													{connectedAccountsCount ===
													1
														? t(
																"expenses.teamMembers.consolidated.account",
															)
														: t(
																"expenses.teamMembers.consolidated.accounts",
															)}
												</Badge>
												{accountNames && (
													<span className="text-muted-foreground text-xs">
														({accountNames})
													</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													member.status === "active"
														? "default"
														: "outline"
												}
											>
												{member.status === "active"
													? t(
															"expenses.teamMembers.status.active",
														)
													: member.status ===
															"inactive"
														? t(
																"expenses.teamMembers.status.inactive",
															)
														: member.status}
											</Badge>
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
													>
														<MoreVerticalIcon className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem>
														{t(
															"expenses.teamMembers.view",
														)}
													</DropdownMenuItem>
													<DropdownMenuItem>
														{t(
															"expenses.teamMembers.edit",
														)}
													</DropdownMenuItem>
													<DropdownMenuItem className="text-destructive">
														{t(
															"expenses.teamMembers.delete",
														)}
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
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
									{t("expenses.teamMembers.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{createDialogOpen && (
				<CreateTeamMemberDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					organizationId={organizationId}
				/>
			)}

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

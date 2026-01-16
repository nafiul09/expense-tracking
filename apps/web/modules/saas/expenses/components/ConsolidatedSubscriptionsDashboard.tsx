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
import { addDays, format } from "date-fns";
import { CalendarIcon, FileTextIcon, RepeatIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface ConsolidatedSubscriptionsDashboardProps {
	organizationId: string;
}

export default function ConsolidatedSubscriptionsDashboard({
	organizationId,
}: ConsolidatedSubscriptionsDashboardProps) {
	const t = useTranslations();
	const [filters, setFilters] = useState({
		accountIds: [] as string[],
		status: undefined as string | undefined,
		renewalFrequency: undefined as string | undefined,
		nextRenewalStart: undefined as Date | undefined,
		nextRenewalEnd: addDays(new Date(), 30) as Date | undefined,
	});
	const [reportDialogOpen, setReportDialogOpen] = useState(false);

	const { data: subscriptions, isLoading } = useQuery({
		queryKey: ["all-subscriptions", organizationId, filters],
		queryFn: () =>
			expensesApi.subscriptions.listAll({
				organizationId,
				accountIds:
					filters.accountIds.length > 0
						? filters.accountIds
						: undefined,
				status: filters.status as
					| "active"
					| "cancelled"
					| "paused"
					| undefined,
				renewalFrequency: filters.renewalFrequency,
				nextRenewalStart: filters.nextRenewalStart,
				nextRenewalEnd: filters.nextRenewalEnd,
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
		if (!subscriptions) {
			return {
				totalActive: 0,
				totalMonthlyCost: 0,
				upcomingRenewals: 0,
				costBreakdown: [],
			};
		}

		const isAllAccounts = filters.accountIds.length === 0;
		const activeSubscriptions = subscriptions.filter(
			(s) => s.status === "active",
		);

		if (isAllAccounts && expenseAccounts) {
			// Calculate per-account breakdown
			const costByAccount = new Map<
				string,
				{ accountName: string; currency: string; monthlyCost: number }
			>();

			for (const account of expenseAccounts) {
				costByAccount.set(account.id, {
					accountName: account.name,
					currency: account.currency,
					monthlyCost: 0,
				});
			}

			for (const subscription of activeSubscriptions) {
				const accountId = subscription.expenseAccountId;
				const amount = Number(subscription.amount || 0);
				let monthlyAmount = amount;
				if (subscription.renewalFrequency === "yearly") {
					monthlyAmount = amount / 12;
				}

				const existing = costByAccount.get(accountId);
				if (existing) {
					existing.monthlyCost += monthlyAmount;
				}
			}

			const breakdown = Array.from(costByAccount.values()).filter(
				(b) => b.monthlyCost > 0,
			);

			const thirtyDaysFromNow = addDays(new Date(), 30);
			const upcomingRenewals = subscriptions.filter(
				(s) =>
					s.status === "active" &&
					new Date(s.renewalDate) <= thirtyDaysFromNow &&
					new Date(s.renewalDate) >= new Date(),
			).length;

			return {
				totalActive: activeSubscriptions.length,
				totalMonthlyCost: 0,
				upcomingRenewals,
				costBreakdown: breakdown,
			};
		}
		// Calculate total for selected accounts in their currency
		let totalMonthlyCost = 0;
		const selectedAccount = expenseAccounts?.find((a) =>
			filters.accountIds.includes(a.id),
		);
		const accountCurrency = selectedAccount?.currency || "USD";

		for (const subscription of activeSubscriptions) {
			if (
				filters.accountIds.length === 0 ||
				filters.accountIds.includes(subscription.expenseAccountId)
			) {
				const subscriptionCurrency =
					subscription.expenseAccount?.currency ||
					subscription.currency ||
					"USD";
				const amount = Number(subscription.amount || 0);
				let monthlyAmount = amount;
				if (subscription.renewalFrequency === "yearly") {
					monthlyAmount = amount / 12;
				}

				if (subscriptionCurrency === accountCurrency) {
					totalMonthlyCost += monthlyAmount;
				} else {
					try {
						const converted = convertCurrency(
							monthlyAmount,
							subscriptionCurrency,
							accountCurrency,
							currencyRates || [],
						);
						totalMonthlyCost += converted;
					} catch {
						totalMonthlyCost += monthlyAmount;
					}
				}
			}
		}

		const thirtyDaysFromNow = addDays(new Date(), 30);
		const upcomingRenewals = subscriptions.filter(
			(s) =>
				s.status === "active" &&
				new Date(s.renewalDate) <= thirtyDaysFromNow &&
				new Date(s.renewalDate) >= new Date(),
		).length;

		return {
			totalActive: activeSubscriptions.length,
			totalMonthlyCost,
			upcomingRenewals,
			costBreakdown: [],
		};
	}, [subscriptions, filters.accountIds, expenseAccounts, currencyRates]);

	const isAllAccountsView = filters.accountIds.length === 0;

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
			<div className="grid gap-4 md:grid-cols-3">
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.subscriptions.consolidated.totalActive",
								)}
							</p>
							<p className="text-2xl font-bold">
								{summaryStats.totalActive}
							</p>
						</div>
						<RepeatIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
				<Card className="p-6">
					<div className="flex items-center justify-between">
						<div className="w-full">
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.subscriptions.consolidated.totalMonthlyCost",
								)}
							</p>
							{isAllAccountsView &&
							summaryStats.costBreakdown &&
							summaryStats.costBreakdown.length > 0 ? (
								<div className="space-y-2 mt-2">
									{summaryStats.costBreakdown.map(
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
														breakdown.monthlyCost,
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
											summaryStats.totalMonthlyCost,
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
						<div>
							<p className="text-muted-foreground text-sm">
								{t(
									"expenses.subscriptions.consolidated.upcomingRenewals",
								)}
							</p>
							<p className="text-2xl font-bold">
								{summaryStats.upcomingRenewals}
							</p>
						</div>
						<FileTextIcon className="text-muted-foreground size-8" />
					</div>
				</Card>
			</div>

			{/* Filters */}
			<Card className="p-4">
				<div className="grid gap-4 md:grid-cols-4">
					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.subscriptions.filters.status")}
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
										"expenses.subscriptions.filters.statusAll",
									)}
								</SelectItem>
								<SelectItem value="active">
									{t(
										"expenses.subscriptions.filters.statusActive",
									)}
								</SelectItem>
								<SelectItem value="cancelled">
									{t(
										"expenses.subscriptions.filters.statusCancelled",
									)}
								</SelectItem>
								<SelectItem value="paused">
									{t(
										"expenses.subscriptions.filters.statusPaused",
									)}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t("expenses.subscriptions.filters.frequency")}
						</div>
						<Select
							value={filters.renewalFrequency || "all"}
							onValueChange={(value) => {
								setFilters((prev) => ({
									...prev,
									renewalFrequency:
										value === "all" ? undefined : value,
								}));
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t(
										"expenses.subscriptions.filters.frequencyAll",
									)}
								</SelectItem>
								<SelectItem value="monthly">
									{t(
										"expenses.subscriptions.filters.frequencyMonthly",
									)}
								</SelectItem>
								<SelectItem value="yearly">
									{t(
										"expenses.subscriptions.filters.frequencyYearly",
									)}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">
							{t(
								"expenses.subscriptions.filters.nextRenewalStart",
							)}
						</div>
						<Input
							type="date"
							value={
								filters.nextRenewalStart
									? format(
											filters.nextRenewalStart,
											"yyyy-MM-dd",
										)
									: ""
							}
							onChange={(e) => {
								setFilters((prev) => ({
									...prev,
									nextRenewalStart: e.target.value
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

				{/* Account Filters */}
				<div className="mt-4 space-y-2">
					<div className="text-sm font-medium">
						{t("expenses.subscriptions.filters.expenseAccounts")}
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

			{/* Subscriptions Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.subscriptions.table.title")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.provider")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.amount")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.frequency")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.nextRenewal")}
							</TableHead>
							<TableHead>
								{t(
									"expenses.subscriptions.consolidated.expenseAccount",
								)}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{subscriptions && subscriptions.length > 0 ? (
							(() => {
								if (isAllAccountsView && expenseAccounts) {
									// Group subscriptions by account
									const subscriptionsByAccount = new Map<
										string,
										typeof subscriptions
									>();

									for (const subscription of subscriptions) {
										const accountId =
											subscription.expenseAccountId;
										if (
											!subscriptionsByAccount.has(
												accountId,
											)
										) {
											subscriptionsByAccount.set(
												accountId,
												[],
											);
										}
										subscriptionsByAccount
											.get(accountId)!
											.push(subscription);
									}

									return Array.from(
										subscriptionsByAccount.entries(),
									).map(
										([accountId, accountSubscriptions]) => {
											const account =
												expenseAccounts.find(
													(a) => a.id === accountId,
												);
											if (!account) return null;

											// Calculate subtotal for this account
											const activeSubs =
												accountSubscriptions.filter(
													(s) =>
														s.status === "active",
												);
											let subtotal = 0;
											for (const sub of activeSubs) {
												const amount = Number(
													sub.amount || 0,
												);
												if (
													sub.renewalFrequency ===
													"monthly"
												) {
													subtotal += amount;
												} else if (
													sub.renewalFrequency ===
													"yearly"
												) {
													subtotal += amount / 12;
												}
											}

											return (
												<Fragment key={accountId}>
													<TableRow className="bg-muted/50">
														<TableCell
															colSpan={7}
															className="font-semibold"
														>
															{account.name} -{" "}
															{account.currency}
														</TableCell>
													</TableRow>
													{accountSubscriptions.map(
														(subscription) => {
															const renewalDate =
																new Date(
																	subscription.renewalDate,
																);
															const daysUntilRenewal =
																Math.ceil(
																	(renewalDate.getTime() -
																		Date.now()) /
																		(1000 *
																			60 *
																			60 *
																			24),
																);
															const isRenewingSoon =
																daysUntilRenewal <=
																	7 &&
																daysUntilRenewal >=
																	0;

															return (
																<TableRow
																	key={
																		subscription.id
																	}
																	className={
																		isRenewingSoon
																			? "bg-yellow-50 dark:bg-yellow-950"
																			: ""
																	}
																>
																	<TableCell className="font-medium">
																		{
																			subscription.title
																		}
																	</TableCell>
																	<TableCell>
																		{subscription.description ||
																			"-"}
																	</TableCell>
																	<TableCell>
																		{formatAmountWithOriginal(
																			Number(
																				subscription.amount ||
																					0,
																			),
																			subscription.currency ||
																				account.currency ||
																				"USD",
																			account.currency ||
																				"USD",
																			currencyRates ||
																				[],
																			null,
																			null,
																		)}
																	</TableCell>
																	<TableCell>
																		<Badge variant="outline">
																			{subscription.renewalFrequency ===
																			"monthly"
																				? t(
																						"expenses.subscriptions.frequency.monthly",
																					)
																				: subscription.renewalFrequency ===
																						"yearly"
																					? t(
																							"expenses.subscriptions.frequency.yearly",
																						)
																					: subscription.renewalFrequency}
																		</Badge>
																	</TableCell>
																	<TableCell>
																		{format(
																			renewalDate,
																			"MMM dd, yyyy",
																		)}
																		{isRenewingSoon && (
																			<Badge
																				variant="outline"
																				className="ml-2 border-yellow-500 text-yellow-700 dark:text-yellow-400"
																			>
																				{t(
																					"expenses.subscriptions.renewingSoon",
																				)}
																			</Badge>
																		)}
																	</TableCell>
																	<TableCell>
																		<Badge variant="secondary">
																			{subscription
																				.expenseAccount
																				?.name ||
																				"-"}
																		</Badge>
																	</TableCell>
																	<TableCell>
																		<Badge
																			variant={
																				subscription.status ===
																				"active"
																					? "default"
																					: subscription.status ===
																							"inactive"
																						? "secondary"
																						: "outline"
																			}
																		>
																			{subscription.status ===
																			"active"
																				? t(
																						"expenses.subscriptions.status.active",
																					)
																				: subscription.status ===
																						"inactive"
																					? t(
																							"expenses.subscriptions.status.inactive",
																						)
																					: subscription.status ===
																							"cancelled"
																						? t(
																								"expenses.subscriptions.status.cancelled",
																							)
																						: subscription.status ===
																								"paused"
																							? t(
																									"expenses.subscriptions.status.paused",
																								)
																							: subscription.status}
																		</Badge>
																	</TableCell>
																</TableRow>
															);
														},
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
																account.currency,
																currencyRates?.find(
																	(r) =>
																		r.toCurrency ===
																		account.currency,
																),
															)}
														</TableCell>
														<TableCell
															colSpan={4}
														/>
													</TableRow>
												</Fragment>
											);
										},
									);
								}

								// Flat table for specific account selection
								return subscriptions.map((subscription) => {
									const renewalDate = new Date(
										subscription.renewalDate,
									);
									const daysUntilRenewal = Math.ceil(
										(renewalDate.getTime() - Date.now()) /
											(1000 * 60 * 60 * 24),
									);
									const isRenewingSoon =
										daysUntilRenewal <= 7 &&
										daysUntilRenewal >= 0;

									return (
										<TableRow
											key={subscription.id}
											className={
												isRenewingSoon
													? "bg-yellow-50 dark:bg-yellow-950"
													: ""
											}
										>
											<TableCell className="font-medium">
												{subscription.title}
											</TableCell>
											<TableCell>
												{subscription.description ||
													"-"}
											</TableCell>
											<TableCell>
												{formatAmountWithOriginal(
													Number(
														subscription.amount ||
															0,
													),
													subscription.currency ||
														subscription
															.expenseAccount
															?.currency ||
														"USD",
													subscription.expenseAccount
														?.currency || "USD",
													currencyRates || [],
													null,
													null,
												)}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{subscription.renewalFrequency ===
													"monthly"
														? t(
																"expenses.subscriptions.frequency.monthly",
															)
														: subscription.renewalFrequency ===
																"yearly"
															? t(
																	"expenses.subscriptions.frequency.yearly",
																)
															: subscription.renewalFrequency}
												</Badge>
											</TableCell>
											<TableCell>
												{format(
													renewalDate,
													"MMM dd, yyyy",
												)}
												{isRenewingSoon && (
													<Badge
														variant="outline"
														className="ml-2 border-yellow-500 text-yellow-700 dark:text-yellow-400"
													>
														{t(
															"expenses.subscriptions.renewingSoon",
														)}
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{subscription.expenseAccount
														?.name || "-"}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={
														subscription.status ===
														"active"
															? "default"
															: subscription.status ===
																	"inactive"
																? "secondary"
																: "outline"
													}
												>
													{subscription.status ===
													"active"
														? t(
																"expenses.subscriptions.status.active",
															)
														: subscription.status ===
																"inactive"
															? t(
																	"expenses.subscriptions.status.inactive",
																)
															: subscription.status ===
																	"cancelled"
																? t(
																		"expenses.subscriptions.status.cancelled",
																	)
																: subscription.status ===
																		"paused"
																	? t(
																			"expenses.subscriptions.status.paused",
																		)
																	: subscription.status}
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
									{t("expenses.subscriptions.empty")}
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

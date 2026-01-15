"use client";

import { formatAmountWithOriginal, formatCurrency } from "@repo/utils";
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
import { Progress } from "@ui/components/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { format } from "date-fns";
import { MoreVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RecordLoanPaymentDialog } from "./RecordLoanPaymentDialog";

interface LoanListProps {
	businessId: string;
	onLoanSelect?: (loanId: string | null) => void;
}

export function LoanList({
	businessId,
	onLoanSelect,
}: LoanListProps) {
	const t = useTranslations();
	const [paymentDialogLoanId, setPaymentDialogLoanId] = useState<
		string | null
	>(null);

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: loans, isLoading } = useQuery({
		queryKey: ["standalone-loans", businessId],
		queryFn: () =>
			business
				? expensesApi.loans.listStandalone({
						organizationId: business.organizationId,
						accountIds: [businessId],
					})
				: Promise.resolve([]),
		enabled: !!business,
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
								{t("expenses.loans.table.status")}
							</TableHead>
							<TableHead>{t("expenses.table.actions")}</TableHead>
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
								const accountCurrency = business?.currency || "USD";
								
								// Calculate original amount from baseCurrencyAmount and conversionRate
								// conversionRate is FROM original currency TO USD
								// So: baseCurrencyAmount = originalAmount / conversionRate
								// Therefore: originalAmount = baseCurrencyAmount * conversionRate
								let originalPrincipal: number | null = null;
								if (loan.baseCurrencyAmount && loan.conversionRate) {
									originalPrincipal = Number(loan.baseCurrencyAmount) * Number(loan.conversionRate);
								}

								return (
									<TableRow key={loan.id}>
										<TableCell className="font-medium">
											{loan.teamMember.name}
										</TableCell>
										<TableCell>
											{format(
												new Date(loan.loanDate),
												"MMM dd, yyyy",
											)}
										</TableCell>
										<TableCell>
											{originalPrincipal != null && loan.currency !== accountCurrency
												? formatAmountWithOriginal(
														originalPrincipal,
														loan.currency || "USD",
														accountCurrency,
														currencyRates || [],
														loan.baseCurrencyAmount
															? Number(loan.baseCurrencyAmount)
															: null,
														loan.conversionRate
															? Number(loan.conversionRate)
															: null,
													)
												: formatCurrency(
														principal,
														accountCurrency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																accountCurrency,
														),
													)}
										</TableCell>
										<TableCell>
											{originalPrincipal != null && loan.currency !== accountCurrency
												? (() => {
														// Calculate remaining in original currency proportionally
														const remainingRatio = remaining / principal;
														const originalRemaining = originalPrincipal * remainingRatio;
														return formatAmountWithOriginal(
															originalRemaining,
															loan.currency || "USD",
															accountCurrency,
															currencyRates || [],
															loan.baseCurrencyAmount
																? Number(loan.baseCurrencyAmount) * remainingRatio
																: null,
															loan.conversionRate
																? Number(loan.conversionRate)
																: null,
														);
													})()
												: formatCurrency(
														remaining,
														accountCurrency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																accountCurrency,
														),
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
																"cancelled"
															? t(
																	"expenses.loans.status.cancelled",
																)
															: loan.status}
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
													{loan.status === "active" &&
														remaining > 0 && (
															<DropdownMenuItem
																onClick={() => {
																	setPaymentDialogLoanId(
																		loan.id,
																	);
																	onLoanSelect?.(loan.id);
																}}
															>
																{t(
																	"loans.recordPayment",
																)}
															</DropdownMenuItem>
														)}
													<DropdownMenuItem>
														{t("loans.viewHistory")}
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
									{t("expenses.loans.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{paymentDialogLoanId && (
				<RecordLoanPaymentDialog
					open={!!paymentDialogLoanId}
					onOpenChange={(open) =>
						!open && setPaymentDialogLoanId(null)
					}
					loanId={paymentDialogLoanId}
					businessId={businessId}
				/>
			)}
		</div>
	);
}

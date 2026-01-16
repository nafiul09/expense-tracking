"use client";

import { formatAmountWithOriginal, formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
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
import { MoreVerticalIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { RecordLoanPaymentDialog } from "./RecordLoanPaymentDialog";
import { ViewLoanPaymentHistoryDialog } from "./ViewLoanPaymentHistoryDialog";

interface LoanListProps {
	businessId: string;
	onLoanSelect?: (loanId: string | null) => void;
}

export function LoanList({ businessId, onLoanSelect }: LoanListProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [paymentDialogLoanId, setPaymentDialogLoanId] = useState<
		string | null
	>(null);
	const [historyDialogLoanId, setHistoryDialogLoanId] = useState<
		string | null
	>(null);
	const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: loans, isLoading } = useQuery({
		queryKey: ["loans", businessId],
		queryFn: () =>
			expensesApi.loans.list({
				businessId,
			}),
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const handleDelete = async (loanId: string) => {
		try {
			await expensesApi.loans.delete(loanId);
			toast.success(
				t("expenses.loans.messages.deleted") ||
					"Loan deleted successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["loans", businessId] });
			setDeletingLoanId(null);
		} catch (error) {
			toast.error(
				t("expenses.loans.messages.deleteError") ||
					"Failed to delete loan",
			);
			console.error(error);
		}
	};

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
								const accountCurrency =
									business?.currency || "USD";

								return (
									<TableRow key={loan.id}>
										<TableCell>
											<Badge
												variant={
													loan.loanType === "given"
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
											{loan.currency !==
												accountCurrency &&
											loan.baseCurrencyAmount != null
												? formatAmountWithOriginal(
														principal,
														loan.currency || "USD",
														accountCurrency,
														currencyRates || [],
														Number(
															loan.baseCurrencyAmount,
														),
														loan.conversionRate
															? Number(
																	loan.conversionRate,
																)
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
											{loan.currency !==
												accountCurrency &&
											loan.baseCurrencyAmount != null
												? (() => {
														// Calculate remaining proportionally
														const remainingRatio =
															remaining /
															principal;
														const remainingInUSD =
															Number(
																loan.baseCurrencyAmount,
															) * remainingRatio;
														return formatAmountWithOriginal(
															remaining,
															loan.currency ||
																"USD",
															accountCurrency,
															currencyRates || [],
															remainingInUSD,
															loan.conversionRate
																? Number(
																		loan.conversionRate,
																	)
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
														: "secondary"
												}
											>
												{loan.status === "paid"
													? t(
															"expenses.loans.status.paid",
														)
													: t(
															"expenses.loans.status.active",
														)}
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
													<DropdownMenuItem
														onClick={() =>
															setHistoryDialogLoanId(
																loan.id,
															)
														}
													>
														{t("loans.viewHistory")}
													</DropdownMenuItem>
													{loan.status === "active" &&
														remaining > 0 && (
															<DropdownMenuItem
																onClick={() => {
																	setPaymentDialogLoanId(
																		loan.id,
																	);
																	onLoanSelect?.(
																		loan.id,
																	);
																}}
															>
																{t(
																	"loans.recordPayment",
																)}
															</DropdownMenuItem>
														)}
													<DropdownMenuItem
														className="text-destructive"
														onClick={() =>
															setDeletingLoanId(
																loan.id,
															)
														}
													>
														<TrashIcon className="size-4 mr-2" />
														{t("common.delete")}
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

			{historyDialogLoanId && (
				<ViewLoanPaymentHistoryDialog
					open={!!historyDialogLoanId}
					onOpenChange={(open) =>
						!open && setHistoryDialogLoanId(null)
					}
					loanId={historyDialogLoanId}
					businessId={businessId}
				/>
			)}

			<AlertDialog
				open={!!deletingLoanId}
				onOpenChange={(open) => !open && setDeletingLoanId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("expenses.loans.deleteTitle") || "Delete Loan"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("expenses.loans.deleteWarning") ||
								"Are you sure you want to permanently delete this loan?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-4">
						<div className="bg-muted rounded-md p-4 space-y-2 text-sm">
							<p className="font-medium">
								{t("expenses.loans.deleteNote") ||
									"What happens when you delete:"}
							</p>
							<ul className="list-disc list-inside space-y-1 text-muted-foreground">
								<li>
									{t("expenses.loans.deletePoint1") ||
										"The loan record will be permanently removed"}
								</li>
								<li>
									{t("expenses.loans.deletePoint2") ||
										"Payment history will be deleted"}
								</li>
								<li>
									{t("expenses.loans.deletePoint3") ||
										"This action cannot be undone"}
								</li>
							</ul>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("common.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deletingLoanId) {
									handleDelete(deletingLoanId);
								}
							}}
						>
							{t("common.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

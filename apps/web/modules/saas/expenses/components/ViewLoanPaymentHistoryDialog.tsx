"use client";

import { formatCurrency } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
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

interface ViewLoanPaymentHistoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: string;
	businessId: string;
}

export function ViewLoanPaymentHistoryDialog({
	open,
	onOpenChange,
	loanId,
	businessId,
}: ViewLoanPaymentHistoryDialogProps) {
	const t = useTranslations();

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: loan, isLoading } = useQuery({
		queryKey: ["loan-history", loanId],
		queryFn: () => expensesApi.loans.getHistory(loanId),
		enabled: !!loanId && open,
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencyRates", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const accountCurrency = business?.currency || "USD";
	const principal = loan ? Number(loan.principalAmount) : 0;
	const currentBalance = loan ? Number(loan.currentBalance) : 0;
	const totalPaid = principal - currentBalance;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("loans.paymentHistory")}</DialogTitle>
					<DialogDescription>
						{loan?.partyName && (
							<span className="font-medium">
								{t("loans.loanType.given") === "Loan Given" &&
								loan.loanType === "given"
									? `${t("loans.loanType.given")} to ${loan.partyName}`
									: `${t("loans.loanType.taken")} from ${loan.partyName}`}
							</span>
						)}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="text-center py-8">
						{t("common.loading")}
					</div>
				) : !loan ? (
					<div className="text-center py-8 text-muted-foreground">
						{t("expenses.loans.empty")}
					</div>
				) : (
					<div className="space-y-6">
						{/* Loan Summary */}
						<div className="grid grid-cols-3 gap-4">
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("loans.principalAmount")}
								</div>
								<div className="text-2xl font-bold">
									{formatCurrency(
										principal,
										accountCurrency,
										currencyRates?.find(
											(r) =>
												r.toCurrency ===
												accountCurrency,
										),
									)}
								</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("common.totalPaid") || "Total Paid"}
								</div>
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">
									{formatCurrency(
										totalPaid,
										accountCurrency,
										currencyRates?.find(
											(r) =>
												r.toCurrency ===
												accountCurrency,
										),
									)}
								</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("loans.currentBalance")}
								</div>
								<div className="text-2xl font-bold">
									{formatCurrency(
										currentBalance,
										accountCurrency,
										currencyRates?.find(
											(r) =>
												r.toCurrency ===
												accountCurrency,
										),
									)}
								</div>
								<div className="mt-2">
									<Badge
										variant={
											loan.status === "paid"
												? "default"
												: "secondary"
										}
									>
										{loan.status === "paid"
											? t("expenses.loans.status.paid")
											: t("expenses.loans.status.active")}
									</Badge>
								</div>
							</div>
						</div>

						{/* Payment History Table */}
						<div>
							<h3 className="text-lg font-semibold mb-4">
								{t("loans.paymentHistory")}
							</h3>
							{loan.payments && loan.payments.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												{t("common.date") || "Date"}
											</TableHead>
											<TableHead>
												{t("common.amount") || "Amount"}
											</TableHead>
											<TableHead>
												{t("loans.form.paymentType")}
											</TableHead>
											<TableHead>
												{t("expenses.form.description")}
											</TableHead>
											<TableHead>
												{t("common.recordedBy") ||
													"Recorded By"}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loan.payments.map((payment: any) => (
											<TableRow key={payment.id}>
												<TableCell>
													{format(
														new Date(
															payment.paymentDate,
														),
														"MMM dd, yyyy",
													)}
												</TableCell>
												<TableCell className="font-medium">
													{formatCurrency(
														Number(payment.amount),
														accountCurrency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																accountCurrency,
														),
													)}
												</TableCell>
												<TableCell>
													<Badge variant="outline">
														{payment.paymentType ===
														"principal"
															? t(
																	"loans.form.paymentTypePrincipal",
																)
															: payment.paymentType ===
																	"interest"
																? t(
																		"loans.form.paymentTypeInterest",
																	)
																: t(
																		"loans.form.paymentTypeBoth",
																	)}
													</Badge>
												</TableCell>
												<TableCell className="text-muted-foreground">
													{payment.notes || "-"}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{payment.recorder?.name ||
														payment.recorder
															?.email ||
														"-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									{t("loans.noPayments") ||
										"No payments recorded yet"}
								</div>
							)}
						</div>

						{/* Loan Details */}
						{(loan.notes ||
							loan.dueDate ||
							loan.interestRate ||
							loan.collateral) && (
							<div className="rounded-lg border p-4 space-y-3">
								<h3 className="font-semibold">
									{t("loans.loanInfo")}
								</h3>
								{loan.notes && (
									<div>
										<div className="text-sm text-muted-foreground">
											{t("expenses.form.description")}
										</div>
										<div className="text-sm">
											{loan.notes}
										</div>
									</div>
								)}
								{loan.dueDate && (
									<div>
										<div className="text-sm text-muted-foreground">
											{t("loans.form.dueDate")}
										</div>
										<div className="text-sm">
											{format(
												new Date(loan.dueDate),
												"MMM dd, yyyy",
											)}
										</div>
									</div>
								)}
								{loan.interestRate && (
									<div>
										<div className="text-sm text-muted-foreground">
											{t("loans.form.interestRate")}
										</div>
										<div className="text-sm">
											{Number(loan.interestRate)}% per
											year (
											{loan.interestType === "simple"
												? t(
														"loans.form.interestTypeSimple",
													)
												: loan.interestType ===
														"compound"
													? t(
															"loans.form.interestTypeCompound",
														)
													: t(
															"loans.form.interestTypeNone",
														)}
											)
										</div>
									</div>
								)}
								{loan.collateral && (
									<div>
										<div className="text-sm text-muted-foreground">
											{t("loans.form.collateral")}
										</div>
										<div className="text-sm">
											{loan.collateral}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

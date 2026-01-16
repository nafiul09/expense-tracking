"use client";

import { config } from "@repo/config";
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

interface ViewTeamMemberDetailsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberId: string;
	businessId: string;
}

export function ViewTeamMemberDetailsDialog({
	open,
	onOpenChange,
	memberId,
	businessId,
}: ViewTeamMemberDetailsDialogProps) {
	const t = useTranslations();

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: member, isLoading } = useQuery({
		queryKey: ["teamMember", memberId],
		queryFn: () => expensesApi.teamMembers.getDetails(memberId),
		enabled: !!memberId && open,
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencyRates", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const businessCurrency =
		business?.currency || config.expenses.defaultBaseCurrency;
	const currencyRate =
		businessCurrency === config.expenses.defaultBaseCurrency
			? null
			: currencyRates?.find((r) => r.toCurrency === businessCurrency);

	const totalPaid =
		member?.expenses?.reduce(
			(sum: number, expense: any) => sum + Number(expense.amount || 0),
			0,
		) || 0;

	const paymentCount = member?.expenses?.length || 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("expenses.teamMembers.details") ||
							"Team Member Details"}
					</DialogTitle>
					<DialogDescription>
						{member?.name && (
							<span className="font-medium">{member.name}</span>
						)}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="text-center py-8">
						{t("common.loading")}
					</div>
				) : !member ? (
					<div className="text-center py-8 text-muted-foreground">
						{t("expenses.teamMembers.notFound") ||
							"Team member not found"}
					</div>
				) : (
					<div className="space-y-6">
						{/* Member Summary */}
						<div className="grid grid-cols-3 gap-4">
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("expenses.teamMembers.table.salary")}
								</div>
								<div className="text-2xl font-bold">
									{member.salary
										? formatCurrency(
												Number(member.salary),
												businessCurrency,
												currencyRate || undefined,
											)
										: "-"}
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									{t("expenses.teamMembers.monthlySalary") ||
										"Monthly Salary"}
								</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("common.totalPaid") || "Total Paid"}
								</div>
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">
									{formatCurrency(
										totalPaid,
										businessCurrency,
										currencyRate || undefined,
									)}
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									{t(
										"expenses.teamMembers.lifetimePayments",
										{
											count: paymentCount,
										},
									) || `${paymentCount} payments`}
								</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-sm text-muted-foreground mb-1">
									{t("expenses.teamMembers.table.status")}
								</div>
								<div className="mt-2">
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
											: t(
													"expenses.teamMembers.status.inactive",
												)}
									</Badge>
								</div>
							</div>
						</div>

						{/* Member Information */}
						<div className="rounded-lg border p-4 space-y-3">
							<h3 className="font-semibold">
								{t("expenses.teamMembers.information") ||
									"Member Information"}
							</h3>
							<div className="grid grid-cols-2 gap-4 text-sm">
								{member.position && (
									<div>
										<div className="text-muted-foreground">
											{t(
												"expenses.teamMembers.table.position",
											)}
										</div>
										<div className="font-medium">
											{member.position}
										</div>
									</div>
								)}
								{member.email && (
									<div>
										<div className="text-muted-foreground">
											{t("common.email") || "Email"}
										</div>
										<div className="font-medium">
											{member.email}
										</div>
									</div>
								)}
								{member.joinedDate && (
									<div>
										<div className="text-muted-foreground">
											{t(
												"expenses.teamMembers.table.joinDate",
											)}
										</div>
										<div className="font-medium">
											{format(
												new Date(member.joinedDate),
												"MMM dd, yyyy",
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Salary Payment History */}
						<div>
							<h3 className="text-lg font-semibold mb-4">
								{t("expenses.teamMembers.salaryHistory") ||
									"Salary Payment History"}
							</h3>
							{member.expenses && member.expenses.length > 0 ? (
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
												{t("expenses.form.description")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{member.expenses.map((expense: any) => (
											<TableRow key={expense.id}>
												<TableCell>
													{format(
														new Date(expense.date),
														"MMM dd, yyyy",
													)}
												</TableCell>
												<TableCell className="font-medium">
													{formatCurrency(
														Number(expense.amount),
														businessCurrency,
														currencyRate ||
															undefined,
													)}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{expense.description || "-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									{t(
										"expenses.teamMembers.noSalaryPayments",
									) || "No salary payments recorded yet"}
								</div>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

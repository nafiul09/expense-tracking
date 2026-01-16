"use client";

import { formatAmountWithOriginal } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { format } from "date-fns";
import { EditIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";
import { EditExpenseDialog } from "./EditExpenseDialog";

interface OneTimeExpenseListProps {
	businessId: string;
}

export function OneTimeExpenseList({ businessId }: OneTimeExpenseListProps) {
	const t = useTranslations();
	const [editingExpenseId, setEditingExpenseId] = useState<string | null>(
		null,
	);
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
		null,
	);

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: expenses, isLoading } = useQuery({
		queryKey: ["expenses", businessId, "one-time"],
		queryFn: () =>
			expensesApi.expenses.list({
				businessId,
				expenseType: "one_time",
				limit: 50,
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

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	return (
		<div className="space-y-4">
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("expenses.table.title")}</TableHead>
							<TableHead>
								{t("expenses.table.expenseType") || "Expense Type"}
							</TableHead>
							<TableHead>{t("expenses.table.amount")}</TableHead>
							<TableHead>{t("expenses.table.date")}</TableHead>
							<TableHead>{t("expenses.table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses && expenses.length > 0 ? (
							expenses.map((expense) => (
								<TableRow key={expense.id}>
									<TableCell className="font-medium">
										{expense.title}
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{t("expenses.expenseType.oneTime") ||
												"One-Time"}
										</Badge>
									</TableCell>
									<TableCell>
										{formatAmountWithOriginal(
											Number(expense.amount),
											expense.currency ||
												business?.currency ||
												"USD",
											business?.currency || "USD",
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
										{format(
											new Date(expense.date),
											"MMM dd, yyyy",
										)}
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
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.oneTime.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{editingExpenseId && (
				<EditExpenseDialog
					open={!!editingExpenseId}
					onOpenChange={(open) => !open && setEditingExpenseId(null)}
					expenseId={editingExpenseId}
					businessId={businessId}
				/>
			)}

			{deletingExpenseId && (
				<DeleteExpenseDialog
					open={!!deletingExpenseId}
					onOpenChange={(open) => !open && setDeletingExpenseId(null)}
					expenseId={deletingExpenseId}
					businessId={businessId}
				/>
			)}
		</div>
	);
}

"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
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
import { useTranslations } from "next-intl";

interface SubscriptionListProps {
	businessId: string;
}

export function SubscriptionList({ businessId }: SubscriptionListProps) {
	const t = useTranslations();

	const { data: subscriptions, isLoading } = useQuery({
		queryKey: ["subscriptions", businessId],
		queryFn: () => expensesApi.subscriptions.list({ businessId }),
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
								{t("expenses.subscriptions.table.name")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.amount")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.renewalDate")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{subscriptions && subscriptions.length > 0 ? (
							subscriptions.map((subscription) => (
								<TableRow key={subscription.id}>
									<TableCell className="font-medium">
										{subscription.expense.title}
									</TableCell>
									<TableCell>
										{subscription.expense.currency}{" "}
										{Number(
											subscription.expense.amount,
										).toFixed(2)}
									</TableCell>
									<TableCell>
										{format(
											new Date(subscription.renewalDate),
											"MMM dd, yyyy",
										)}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												subscription.status === "active"
													? "default"
													: "secondary"
											}
										>
											{subscription.status}
										</Badge>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.subscriptions.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

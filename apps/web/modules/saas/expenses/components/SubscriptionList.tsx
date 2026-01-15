"use client";

import { formatAmountWithOriginal } from "@repo/utils";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { EditSubscriptionDialog } from "./EditSubscriptionDialog";

interface SubscriptionListProps {
	businessId: string;
}

export function SubscriptionList({ businessId }: SubscriptionListProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [editingSubscriptionId, setEditingSubscriptionId] = useState<
		string | null
	>(null);

	const { data: subscriptions, isLoading } = useQuery({
		queryKey: ["subscriptions", businessId],
		queryFn: () => expensesApi.subscriptions.list({ businessId }),
	});

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
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
							<TableHead>
								{t("expenses.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{subscriptions && subscriptions.length > 0 ? (
							subscriptions.map((subscription) => {
								// Calculate total paid from expenses array
								const totalPaid = subscription.expenses?.reduce(
									(sum, expense) => sum + Number(expense.amount || 0),
									0,
								) || 0;

								return (
									<TableRow key={subscription.id}>
										<TableCell className="font-medium">
											{subscription.title}
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div>
													{formatAmountWithOriginal(
														Number(subscription.currentAmount || 0),
														subscription.currency || business?.currency || "USD",
														business?.currency || "USD",
														currencyRates || [],
														null,
														null,
													)}
													<span className="text-xs text-muted-foreground ml-2">
														({t("expenses.subscriptions.currentAmount")})
													</span>
												</div>
												{totalPaid > 0 && (
													<div className="text-xs text-muted-foreground">
														{t("expenses.subscriptions.totalPaid")}:{" "}
														{formatAmountWithOriginal(
															totalPaid,
															subscription.currency || business?.currency || "USD",
															business?.currency || "USD",
															currencyRates || [],
															null,
															null,
														)}
													</div>
												)}
											</div>
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
														: subscription.status === "inactive"
															? "secondary"
															: "outline"
												}
											>
												{subscription.status === "active"
													? t("expenses.subscriptions.status.active")
													: subscription.status === "inactive"
														? t("expenses.subscriptions.status.inactive")
														: subscription.status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setEditingSubscriptionId(
															subscription.id,
														)
													}
												>
													<EditIcon className="size-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center py-8 text-muted-foreground"
								>
									{t("expenses.subscriptions.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			{editingSubscriptionId && (
				<EditSubscriptionDialog
					open={!!editingSubscriptionId}
					onOpenChange={(open) =>
						!open && setEditingSubscriptionId(null)
					}
					subscriptionId={editingSubscriptionId}
					businessId={businessId}
				/>
			)}
		</div>
	);
}

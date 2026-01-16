"use client";

import { formatAmountWithOriginal } from "@repo/utils";
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
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
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
	const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<
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

	const handleDelete = async () => {
		if (!deletingSubscriptionId) {
			return;
		}

		try {
			await expensesApi.subscriptions.delete(deletingSubscriptionId);

			toast.success(
				t("expenses.subscriptions.deleted") ||
					"Subscription deleted successfully",
			);

			queryClient.invalidateQueries({
				queryKey: ["subscriptions", businessId],
			});

			setDeletingSubscriptionId(null);
		} catch (error) {
			toast.error(
				t("expenses.subscriptions.deleteError") ||
					"Failed to delete subscription",
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
								{t("expenses.subscriptions.table.name")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.amount")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.frequency")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.renewalDate")}
							</TableHead>
							<TableHead>
								{t("expenses.subscriptions.table.status")}
							</TableHead>
							<TableHead>{t("expenses.table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{subscriptions && subscriptions.length > 0 ? (
							subscriptions.map((subscription) => {
								// Calculate total paid from expenses array
								const totalPaid =
									subscription.expenses?.reduce(
										(sum, expense) =>
											sum + Number(expense.amount || 0),
										0,
									) || 0;

								return (
									<TableRow key={subscription.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{subscription.websiteIcon && (
													<Image
														src={subscription.websiteIcon}
														alt={subscription.title}
														width={20}
														height={20}
														className="rounded"
														onError={() => {
															// Hide on error - handled by Next.js Image
														}}
													/>
												)}
												<div>
													<div className="font-medium">
														{subscription.title}
													</div>
													{subscription.description && (
														<div className="text-xs text-muted-foreground">
															{subscription.description}
														</div>
													)}
													{subscription.websiteUrl && (
														<a
															href={subscription.websiteUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="text-xs text-primary hover:underline"
														>
															{subscription.websiteUrl}
														</a>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div className="font-medium">
													{formatAmountWithOriginal(
														Number(
															subscription.amount ||
																0,
														),
														subscription.currency ||
															business?.currency ||
															"USD",
														business?.currency ||
															"USD",
														currencyRates || [],
														subscription.rateType === "custom" ? Number(subscription.conversionRate) : null,
														null,
													)}
												</div>
												{totalPaid > 0 && (
													<div className="text-xs text-muted-foreground">
														{t(
															"expenses.subscriptions.totalPaid",
														)}
														:{" "}
														{formatAmountWithOriginal(
															totalPaid,
															subscription.currency ||
																business?.currency ||
																"USD",
															business?.currency ||
																"USD",
															currencyRates || [],
															null,
															null,
														)}
													</div>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm">
												{subscription.renewalFrequency === "monthly" && t("expenses.subscriptions.frequency.monthly")}
												{subscription.renewalFrequency === "yearly" && t("expenses.subscriptions.frequency.yearly")}
												{subscription.renewalFrequency === "weekly" && "Weekly"}
											</div>
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div>
													{format(
														new Date(
															subscription.renewalDate,
														),
														"MMM dd, yyyy",
													)}
												</div>
												{subscription.reminderDays && (
													<div className="text-xs text-muted-foreground">
														Reminder: {subscription.reminderDays} days before
													</div>
												)}
											</div>
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
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setDeletingSubscriptionId(
															subscription.id,
														)
													}
												>
													<TrashIcon className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell
									colSpan={6}
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

			<AlertDialog
				open={!!deletingSubscriptionId}
				onOpenChange={(open) =>
					!open && setDeletingSubscriptionId(null)
				}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("expenses.subscriptions.deleteTitle") ||
								"Delete Subscription"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("expenses.subscriptions.deleteWarning") ||
								"Are you sure you want to permanently delete this subscription?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-3">
						<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md space-y-1 text-sm">
							<p className="font-medium text-blue-900 dark:text-blue-100">
								{t("expenses.subscriptions.deleteSuggestion") ||
									"💡 Suggestion:"}
							</p>
							<p className="text-blue-800 dark:text-blue-200">
								{t("expenses.subscriptions.deleteSuggestionText") ||
									"We recommend using 'Inactive' or 'Cancelled' status from the Edit modal instead. This will keep your subscription data tracked properly for reports and history."}
							</p>
						</div>
						<div className="bg-muted p-3 rounded-md space-y-2 text-sm">
							<p className="font-medium text-destructive">
								{t("expenses.subscriptions.deleteNote") ||
									"Warning: This action cannot be undone!"}
							</p>
							<ul className="list-disc list-inside space-y-1">
								<li>
									{t("expenses.subscriptions.deletePoint1") ||
										"This will permanently remove the subscription record"}
								</li>
								<li>
									{t("expenses.subscriptions.deletePoint2") ||
										"Past expense records will be kept but unlinked from this subscription"}
								</li>
								<li>
									{t("expenses.subscriptions.deletePoint3") ||
										"No new expenses will be automatically created"}
								</li>
								<li>
									{t("expenses.subscriptions.deletePoint4") ||
										"If you want to temporarily stop the subscription, use 'Cancelled' status in Edit instead"}
								</li>
							</ul>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("common.cancel") || "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{t("common.delete") || "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

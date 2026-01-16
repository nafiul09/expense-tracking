"use client";

// Team member list with view, edit, and delete actions

import { config } from "@repo/config";
import { formatCurrency } from "@repo/utils";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { format } from "date-fns";
import { MoreVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EditTeamMemberDialog } from "./EditTeamMemberDialog";
import { ViewTeamMemberDetailsDialog } from "./ViewTeamMemberDetailsDialog";

interface TeamMemberListProps {
	businessId: string;
}

export function TeamMemberList({ businessId }: TeamMemberListProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
	const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
	const [deletingMemberId, setDeletingMemberId] = useState<string | null>(
		null,
	);

	const handleDelete = async (memberId: string) => {
		try {
			await expensesApi.teamMembers.delete(memberId);
			toast.success(
				t("expenses.teamMembers.deleted") ||
					"Team member deleted successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["teamMembers", businessId],
			});
			setDeletingMemberId(null);
		} catch (error) {
			toast.error(
				t("expenses.teamMembers.deleteError") ||
					"Failed to delete team member",
			);
			console.error(error);
		}
	};

	const { data: teamMembers, isLoading } = useQuery({
		queryKey: ["teamMembers", businessId],
		queryFn: () => expensesApi.teamMembers.list(businessId),
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

	// Get currency rate for the business currency
	const businessCurrency =
		business?.currency || config.expenses.defaultBaseCurrency;
	const currencyRate =
		businessCurrency === config.expenses.defaultBaseCurrency
			? null
			: currencyRates?.find((r) => r.toCurrency === businessCurrency);

	return (
		<div className="space-y-4">
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("expenses.teamMembers.table.name")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.position")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.salary")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.joinDate")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.totalPaid")}
							</TableHead>
							<TableHead>
								{t("expenses.teamMembers.table.status")}
							</TableHead>
							<TableHead>{t("expenses.table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamMembers && teamMembers.length > 0 ? (
							teamMembers.map((member) => {
								// Calculate total paid from salary expenses
								const totalPaid =
									member.expenses?.reduce(
										(sum: number, expense: any) =>
											sum + Number(expense.amount || 0),
										0,
									) || 0;

								return (
									<TableRow key={member.id}>
										<TableCell className="font-medium">
											<div>
												<div>{member.name}</div>
												{member.email && (
													<div className="text-xs text-muted-foreground">
														{member.email}
													</div>
												)}
											</div>
										</TableCell>
										<TableCell>
											{member.position || "-"}
										</TableCell>
										<TableCell>
											{member.salary
												? formatCurrency(
														Number(member.salary),
														businessCurrency,
														currencyRate ||
															undefined,
													)
												: "-"}
										</TableCell>
										<TableCell>
											{member.joinedDate
												? format(
														new Date(
															member.joinedDate,
														),
														"MMM dd, yyyy",
													)
												: "-"}
										</TableCell>
										<TableCell className="font-medium">
											{formatCurrency(
												totalPaid,
												businessCurrency,
												currencyRate || undefined,
											)}
										</TableCell>
										<TableCell>
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
													<DropdownMenuItem
														onClick={() =>
															setViewingMemberId(
																member.id,
															)
														}
													>
														{t(
															"expenses.teamMembers.viewDetails",
														) || "View Details"}
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															setEditingMemberId(
																member.id,
															)
														}
													>
														<PencilIcon className="size-4 mr-2" />
														{t("common.edit") ||
															"Edit"}
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive"
														onClick={() =>
															setDeletingMemberId(
																member.id,
															)
														}
													>
														<TrashIcon className="size-4 mr-2" />
														{t("common.delete") ||
															"Delete"}
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

			{viewingMemberId && (
				<ViewTeamMemberDetailsDialog
					open={!!viewingMemberId}
					onOpenChange={(open: boolean) =>
						!open && setViewingMemberId(null)
					}
					memberId={viewingMemberId}
					businessId={businessId}
				/>
			)}

			{editingMemberId && (
				<EditTeamMemberDialog
					open={!!editingMemberId}
					onOpenChange={(open: boolean) =>
						!open && setEditingMemberId(null)
					}
					memberId={editingMemberId}
					businessId={businessId}
				/>
			)}

			<AlertDialog
				open={!!deletingMemberId}
				onOpenChange={(open) => !open && setDeletingMemberId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("expenses.teamMembers.deleteTitle") ||
								"Delete Team Member"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("expenses.teamMembers.deleteWarning") ||
								"Are you sure you want to delete this team member?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-4">
						<div className="bg-muted rounded-md p-4 space-y-2 text-sm">
							<p className="font-medium">
								{t("expenses.teamMembers.deleteNote") ||
									"What happens when you delete:"}
							</p>
							<ul className="list-disc list-inside space-y-1 text-muted-foreground">
								<li>
									{t("expenses.teamMembers.deletePoint1") ||
										"The team member will be removed from the list"}
								</li>
								<li>
									{t("expenses.teamMembers.deletePoint2") ||
										"Past salary payment records will be preserved"}
								</li>
								<li>
									{t("expenses.teamMembers.deletePoint3") ||
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
								if (deletingMemberId) {
									handleDelete(deletingMemberId);
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

"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { MoreVerticalIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateExpenseDialog } from "./CreateExpenseDialog";
import { DeleteBusinessDialog } from "./DeleteBusinessDialog";
import { EditBusinessDialog } from "./EditBusinessDialog";
import { ExpenseList } from "./ExpenseList";
import { LoanList } from "./LoanList";
import { SubscriptionList } from "./SubscriptionList";
import { TeamMemberList } from "./TeamMemberList";

interface BusinessDashboardProps {
	businessId: string;
}

export default function BusinessDashboard({
	businessId,
}: BusinessDashboardProps) {
	const t = useTranslations();
	const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { data: business, isLoading } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	if (!business) {
		return <div>Business not found</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<PageHeader
						title={business.name}
						subtitle={business.description || undefined}
					/>
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVerticalIcon className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => setEditDialogOpen(true)}
							>
								{t("expenses.expenseAccounts.edit")}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								{t("expenses.expenseAccounts.delete")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button onClick={() => setCreateExpenseOpen(true)}>
						<PlusIcon className="mr-2 size-4" />
						{t("expenses.create")}
					</Button>
				</div>
			</div>

			<Tabs defaultValue="expenses" className="w-full">
				<TabsList>
					<TabsTrigger value="expenses">
						{t("expenses.tabs.expenses")}
					</TabsTrigger>
					<TabsTrigger value="subscriptions">
						{t("expenses.tabs.subscriptions")}
					</TabsTrigger>
					<TabsTrigger value="team">
						{t("expenses.tabs.team")}
					</TabsTrigger>
					<TabsTrigger value="loans">
						{t("expenses.tabs.loans")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="expenses">
					<ExpenseList businessId={businessId} />
				</TabsContent>

				<TabsContent value="subscriptions">
					<SubscriptionList businessId={businessId} />
				</TabsContent>

				<TabsContent value="team">
					<TeamMemberList businessId={businessId} />
				</TabsContent>

				<TabsContent value="loans">
					<LoanList businessId={businessId} />
				</TabsContent>
			</Tabs>

			<CreateExpenseDialog
				open={createExpenseOpen}
				onOpenChange={setCreateExpenseOpen}
				businessId={businessId}
			/>

			{business && (
				<>
					<EditBusinessDialog
						open={editDialogOpen}
						onOpenChange={setEditDialogOpen}
						businessId={businessId}
						organizationId={business.organizationId}
					/>

					<DeleteBusinessDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						businessId={businessId}
						organizationId={business.organizationId}
						businessName={business.name}
					/>
				</>
			)}
		</div>
	);
}

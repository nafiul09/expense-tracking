"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Building2Icon, MoreVerticalIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateBusinessDialog } from "./CreateBusinessDialog";
import { DeleteBusinessDialog } from "./DeleteBusinessDialog";
import { EditBusinessDialog } from "./EditBusinessDialog";

interface BusinessListProps {
	organizationId: string;
}

export function BusinessList({ organizationId }: BusinessListProps) {
	const t = useTranslations();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editingBusinessId, setEditingBusinessId] = useState<string | null>(
		null,
	);
	const [deletingBusinessId, setDeletingBusinessId] = useState<string | null>(
		null,
	);
	const { activeOrganization } = useActiveOrganization();

	const { data: businesses, isLoading } = useQuery({
		queryKey: ["businesses", organizationId],
		queryFn: () => expensesApi.businesses.list(organizationId),
	});

	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i} className="h-32 animate-pulse" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					{t("expenses.expenseAccounts.title")}
				</h2>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<PlusIcon className="mr-2 size-4" />
					{t("expenses.expenseAccounts.create")}
				</Button>
			</div>

			{businesses && businesses.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{businesses.map((business) => (
						<Card
							key={business.id}
							className="group relative p-6 transition-colors hover:bg-accent"
						>
							<Link
								href={`/${activeOrganization?.slug}/expenses/${business.id}`}
								className="block space-y-2 pr-8"
							>
								<div className="flex items-center gap-2">
									<Building2Icon className="size-5 text-muted-foreground" />
									<h3 className="font-semibold">
										{business.name}
									</h3>
								</div>
								{business.description && (
									<p className="text-muted-foreground text-sm">
										{business.description}
									</p>
								)}
								<div className="flex items-center gap-4 text-muted-foreground text-sm">
									<span>
										{t("expenses.expenseAccounts.teamMembers", {
											count:
												business._count?.teamMembers ||
												0,
										})}
									</span>
									<span>
										{t("expenses.expenseAccounts.expenses", {
											count:
												business._count?.expenses || 0,
										})}
									</span>
								</div>
							</Link>
							<div className="absolute top-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
											}}
										>
											<MoreVerticalIcon className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setEditingBusinessId(
													business.id,
												);
											}}
										>
											{t("expenses.expenseAccounts.edit")}
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setDeletingBusinessId(
													business.id,
												);
											}}
										>
											{t("expenses.expenseAccounts.delete")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="p-12 text-center">
					<Building2Icon className="mx-auto mb-4 size-12 text-muted-foreground" />
					<p className="text-muted-foreground mb-4">
						{t("expenses.expenseAccounts.empty")}
					</p>
					<Button onClick={() => setCreateDialogOpen(true)}>
						<PlusIcon className="mr-2 size-4" />
						{t("expenses.expenseAccounts.createFirst")}
					</Button>
				</Card>
			)}

			<CreateBusinessDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				organizationId={organizationId}
			/>

			{editingBusinessId && (
				<EditBusinessDialog
					open={!!editingBusinessId}
					onOpenChange={(open) => !open && setEditingBusinessId(null)}
					businessId={editingBusinessId}
					organizationId={organizationId}
				/>
			)}

			{deletingBusinessId && (
				<DeleteBusinessDialog
					open={!!deletingBusinessId}
					onOpenChange={(open) =>
						!open && setDeletingBusinessId(null)
					}
					businessId={deletingBusinessId}
					organizationId={organizationId}
					businessName={
						businesses?.find((b) => b.id === deletingBusinessId)
							?.name || ""
					}
				/>
			)}
		</div>
	);
}

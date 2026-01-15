"use client";

import { config } from "@repo/config";
import { formatCurrency } from "@repo/utils";
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
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateTeamMemberDialog } from "./CreateTeamMemberDialog";

interface TeamMemberListProps {
	businessId: string;
}

export function TeamMemberList({ businessId }: TeamMemberListProps) {
	const t = useTranslations();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">
					{t("expenses.teamMembers.title")}
				</h3>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<PlusIcon className="mr-2 size-4" />
					{t("expenses.teamMembers.create")}
				</Button>
			</div>

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
								{t("expenses.teamMembers.table.status")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamMembers && teamMembers.length > 0 ? (
							teamMembers.map((member) => (
								<TableRow key={member.id}>
									<TableCell className="font-medium">
										{member.name}
									</TableCell>
									<TableCell>
										{member.position || "-"}
									</TableCell>
									<TableCell>
										{member.salary
											? formatCurrency(
													Number(member.salary),
													businessCurrency,
													currencyRate || undefined,
												)
											: "-"}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												member.status === "active"
													? "default"
													: "secondary"
											}
										>
											{member.status}
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
									{t("expenses.teamMembers.empty")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>

			<CreateTeamMemberDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				businessId={businessId}
			/>
		</div>
	);
}

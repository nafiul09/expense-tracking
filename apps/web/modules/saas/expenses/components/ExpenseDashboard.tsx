"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { Card } from "@ui/components/card";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { BusinessList } from "./BusinessList";
import { ExpenseOverview } from "./ExpenseOverview";

interface ExpenseDashboardProps {
	organizationId: string;
}

export default function ExpenseDashboard({
	organizationId,
}: ExpenseDashboardProps) {
	const t = useTranslations();

	const { data: businesses } = useQuery({
		queryKey: ["businesses", organizationId],
		queryFn: () => expensesApi.businesses.list(organizationId),
	});

	return (
		<div className="@container space-y-6">
			<ExpenseOverview organizationId={organizationId} />
			<BusinessList organizationId={organizationId} />
		</div>
	);
}

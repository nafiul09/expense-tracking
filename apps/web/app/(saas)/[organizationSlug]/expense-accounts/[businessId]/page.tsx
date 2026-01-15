import { getActiveOrganization } from "@saas/auth/lib/server";
import BusinessDashboard from "@saas/expenses/components/BusinessDashboard";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string; businessId: string }>;
}) {
	const { organizationSlug, businessId } = await params;
	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	return {
		title: activeOrganization
			? `Expense Account - ${activeOrganization.name}`
			: "Expense Account",
	};
}

export default async function ExpenseAccountDetailPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; businessId: string }>;
}) {
	const { organizationSlug, businessId } = await params;

	const activeOrganization = await getActiveOrganization(
		organizationSlug as string,
	);

	if (!activeOrganization) {
		return notFound();
	}

	return <BusinessDashboard businessId={businessId} />;
}

import { getSession } from "@saas/auth/lib/server";
import { AdminDashboard } from "@saas/admin/component/AdminDashboard";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("admin.dashboard.title"),
	};
}

export default async function AdminDashboardPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (session.user?.role !== "admin") {
		redirect("/");
	}

	return <AdminDashboard />;
}

import { getSession } from "@saas/auth/lib/server";
import { AdminSidebar } from "@saas/admin/component/AdminSidebar";
import { DashboardHeader } from "@saas/shared/components/DashboardHeader";
import { SidebarInset, SidebarProvider } from "@ui/components/sidebar";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function AdminLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (session.user?.role !== "admin") {
		// Redirect non-admin to their first workspace
		const { getOrganizationList } = await import("@saas/auth/lib/server");
		const organizations = await getOrganizationList();
		const firstOrg = organizations[0];

		if (firstOrg) {
			redirect(`/${firstOrg.slug}`);
		}
		redirect("/auth/login");
	}

	return (
		<div className="h-screen overflow-hidden bg-background">
			<SidebarProvider className="h-full w-full">
				<AdminSidebar />
				<SidebarInset className="flex flex-col overflow-hidden h-full md:h-[calc(100svh-1rem)] !ml-0">
					<DashboardHeader />
					<div className="flex-1 overflow-y-auto p-4 pt-0">
						<div className="flex flex-col gap-4">{children}</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}

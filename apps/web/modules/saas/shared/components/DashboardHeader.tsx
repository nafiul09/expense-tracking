"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@ui/components/breadcrumb";
import { Separator } from "@ui/components/separator";
import { SidebarTrigger } from "@ui/components/sidebar";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

function generateBreadcrumbs(pathname: string) {
	const segments = pathname.split("/").filter(Boolean);
	const breadcrumbs: { label: string; href: string }[] = [];

	// Build breadcrumbs from segments
	let currentPath = "";
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		currentPath += `/${segment}`;

		// Format segment name (capitalize, replace hyphens with spaces)
		const label = segment
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		breadcrumbs.push({ label, href: currentPath });
	}

	return breadcrumbs;
}

export function DashboardHeader() {
	const pathname = usePathname();
	const _t = useTranslations();

	// Don't show breadcrumb on the main workspace pages
	if (pathname === "/" || pathname === "/admin" || pathname === "/admin/") {
		return (
			<header className="flex h-16 shrink-0 items-center gap-2">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
				</div>
			</header>
		);
	}

	const breadcrumbs = generateBreadcrumbs(pathname);

	return (
		<header className="flex h-16 shrink-0 items-center gap-2">
			<div className="flex items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mr-2 data-[orientation=vertical]:h-4"
				/>
				<Breadcrumb>
					<BreadcrumbList>
						{breadcrumbs.map((crumb, index) => {
							const isLast = index === breadcrumbs.length - 1;
							return (
								<div
									key={crumb.href}
									className="flex items-center gap-2"
								>
									<BreadcrumbItem
										className={
											index === 0 ? "hidden md:block" : ""
										}
									>
										{isLast ? (
											<BreadcrumbPage>
												{crumb.label}
											</BreadcrumbPage>
										) : (
											<BreadcrumbLink href={crumb.href}>
												{crumb.label}
											</BreadcrumbLink>
										)}
									</BreadcrumbItem>
									{!isLast && (
										<BreadcrumbSeparator
											className={
												index === 0
													? "hidden md:block"
													: ""
											}
										/>
									)}
								</div>
							);
						})}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</header>
	);
}

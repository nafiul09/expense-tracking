"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { FullScreenLoader } from "@shared/components/FullScreenLoader";
import { UserAvatar } from "@shared/components/UserAvatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@ui/components/sidebar";
import {
	ChevronsUpDownIcon,
	HardDriveIcon,
	LogOutIcon,
	MoonIcon,
	SettingsIcon,
	SunIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useState } from "react";

export function NavUser() {
	const t = useTranslations();
	const { user } = useSession();
	const params = useParams();
	const organizationSlug = params?.organizationSlug as string | undefined;
	const { setTheme: setCurrentTheme, theme: currentTheme } = useTheme();
	const [_theme, setTheme] = useState<string>(currentTheme ?? "system");
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const { isMobile } = useSidebar();

	// Settings link - use active workspace if available
	const settingsHref = organizationSlug
		? `/${organizationSlug}/settings/account/general`
		: "/";

	const colorModeOptions = [
		{
			value: "system",
			label: "System",
			icon: HardDriveIcon,
		},
		{
			value: "light",
			label: "Light",
			icon: SunIcon,
		},
		{
			value: "dark",
			label: "Dark",
			icon: MoonIcon,
		},
	];

	const onLogout = () => {
		setIsLoggingOut(true);
		// Clear app initialization flag
		sessionStorage.removeItem("app_initialized");

		authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					window.location.href = new URL(
						config.auth.redirectAfterLogout,
						window.location.origin,
					).toString();
				},
				onError: () => {
					setIsLoggingOut(false);
				},
			},
		});
	};

	if (!user) {
		return null;
	}

	const { name, email, image } = user;

	return (
		<>
			{isLoggingOut && <FullScreenLoader message="Logging out..." />}
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<UserAvatar
									name={name ?? ""}
									avatarUrl={image}
									className="h-8 w-8 rounded-lg"
								/>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{name}
									</span>
									<span className="truncate text-xs">
										{email}
									</span>
								</div>
								<ChevronsUpDownIcon className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<UserAvatar
										name={name ?? ""}
										avatarUrl={image}
										className="h-8 w-8 rounded-lg"
									/>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{name}
										</span>
										<span className="truncate text-xs">
											{email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<SunIcon className="mr-2 size-4" />
									{t("app.userMenu.colorMode")}
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									{colorModeOptions.map((option) => (
										<DropdownMenuItem
											key={option.value}
											onClick={() => {
												setTheme(option.value);
												setCurrentTheme(option.value);
											}}
											className="flex items-center gap-2"
										>
											<option.icon className="size-4 opacity-50" />
											{option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuGroup>
								<DropdownMenuItem asChild>
									<Link
										href={settingsHref}
										className="flex items-center gap-2"
									>
										<SettingsIcon className="size-4" />
										{t("app.userMenu.accountSettings")}
									</Link>
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={onLogout}
								className="flex items-center gap-2"
							>
								<LogOutIcon className="size-4" />
								{t("app.userMenu.logout")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
		</>
	);
}

"use client";

import { config } from "@repo/config";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { BuildingIcon } from "lucide-react";
import { useMemo } from "react";
import { useIsClient } from "usehooks-ts";

export const OrganizationLogo = ({
	name: _name,
	logoUrl,
	className,
	ref,
}: React.ComponentProps<typeof Avatar> & {
	name: string;
	logoUrl?: string | null;
	className?: string;
}) => {
	const isClient = useIsClient();

	const logoSrc = useMemo(
		() =>
			logoUrl
				? logoUrl.startsWith("http")
					? logoUrl
					: `/image-proxy/${config.storage.bucketNames.avatars}/${logoUrl}`
				: undefined,
		[logoUrl],
	);

	if (!isClient) {
		return null;
	}

	return (
		<Avatar ref={ref} className={className}>
			<AvatarImage src={logoSrc} />
			<AvatarFallback className="flex items-center justify-center bg-sidebar-accent">
				<BuildingIcon className="size-2/3 text-sidebar-accent-foreground" />
			</AvatarFallback>
		</Avatar>
	);
};

OrganizationLogo.displayName = "OrganizationLogo";

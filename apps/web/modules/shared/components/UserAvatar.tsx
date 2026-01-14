import { config } from "@repo/config";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { UserIcon } from "lucide-react";
import { useMemo } from "react";

export const UserAvatar = ({
	name,
	avatarUrl,
	className,
	ref,
}: React.ComponentProps<typeof Avatar> & {
	name: string;
	avatarUrl?: string | null;
	className?: string;
}) => {
	const initials = useMemo(
		() =>
			name
				?.split(" ")
				.slice(0, 2)
				.map((n) => n[0])
				.join("")
				.toUpperCase() || "U",
		[name],
	);

	const avatarSrc = useMemo(
		() =>
			avatarUrl
				? avatarUrl.startsWith("http")
					? avatarUrl
					: `/image-proxy/${config.storage.bucketNames.avatars}/${avatarUrl}`
				: undefined,
		[avatarUrl],
	);

	return (
		<Avatar ref={ref} className={className}>
			<AvatarImage src={avatarSrc} />
			<AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
				{initials.length > 0 ? (
					<span className="text-sm">{initials}</span>
				) : (
					<UserIcon className="size-1/2" />
				)}
			</AvatarFallback>
		</Avatar>
	);
};

UserAvatar.displayName = "UserAvatar";

import { cn } from "@ui/lib";

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-foreground/5 dark:bg-foreground/3",
				className,
			)}
			{...props}
		/>
	);
}

export { Skeleton };

import { Spinner } from "@shared/components/Spinner";
import { cn } from "@ui/lib";

interface FullScreenLoaderProps {
	message?: string;
	className?: string;
}

export function FullScreenLoader({
	message,
	className,
}: FullScreenLoaderProps) {
	return (
		<div
			className={cn(
				"fixed inset-0 z-50 flex flex-col items-center justify-center",
				"bg-background",
				className,
			)}
		>
			<Spinner className="size-8" />
			{message && (
				<p className="mt-4 text-sm text-muted-foreground animate-pulse">
					{message}
				</p>
			)}
		</div>
	);
}

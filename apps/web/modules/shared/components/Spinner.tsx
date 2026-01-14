import { cn } from "@ui/lib";

export function Spinner({ className }: { className?: string }) {
	return (
		<div
			className={cn("flex items-center justify-center gap-2", className)}
		>
			<div
				className="size-2.5 rounded-full bg-primary animate-bounce"
				style={{ animationDelay: "0ms", animationDuration: "1s" }}
			/>
			<div
				className="size-2.5 rounded-full bg-primary animate-bounce"
				style={{ animationDelay: "150ms", animationDuration: "1s" }}
			/>
			<div
				className="size-2.5 rounded-full bg-primary animate-bounce"
				style={{ animationDelay: "300ms", animationDuration: "1s" }}
			/>
		</div>
	);
}

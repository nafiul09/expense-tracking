import { Slot, Slottable } from "@radix-ui/react-slot";
import { Loader2Icon } from "lucide-react";
import { Spinner } from "@shared/components/Spinner";
import { cn } from "@ui/lib";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/90 hover:ring-2 hover:ring-offset-2",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
				"icon-sm": "h-8 w-8",
				"icon-lg": "h-12 w-12",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type ButtonProps = {
	asChild?: boolean;
	loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

const Button = ({
	className,
	children,
	variant,
	size,
	asChild = false,
	loading,
	disabled,
	...props
}: ButtonProps) => {
	const Comp = asChild ? Slot : "button";

	// For default variant (Sign in button), use circular loader with white color
	// For all other variants, use the original bouncing dots spinner
	const isDefaultVariant = variant === "default" || variant === undefined;

	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			disabled={disabled || loading}
			{...props}
		>
			{loading &&
				(isDefaultVariant ? (
					<Loader2Icon
						role="status"
						aria-label="Loading"
						className="size-4 animate-spin text-white"
					/>
				) : (
					<Spinner />
				))}
			<Slottable>{children}</Slottable>
		</Comp>
	);
};

export { Button, buttonVariants };

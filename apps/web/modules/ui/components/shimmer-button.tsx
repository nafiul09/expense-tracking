"use client";

import { cn } from "@ui/lib";
import {
	motion,
	useMotionValue,
	useTransform,
	animate,
	type HTMLMotionProps,
} from "motion/react";
import * as React from "react";

export interface ShimmerButtonProps extends HTMLMotionProps<"button"> {
	children: React.ReactNode;
	innerClassName?: string;
}

export function ShimmerButton({
	children,
	className,
	innerClassName,
	onClick,
	...props
}: ShimmerButtonProps) {
	const [borderRadius, setBorderRadius] = React.useState("0.375rem");
	const buttonRef = React.useRef<HTMLButtonElement>(null);
	const rotation = useMotionValue(0);

	React.useEffect(() => {
		if (buttonRef.current) {
			const computedStyle = window.getComputedStyle(buttonRef.current);
			const radius = computedStyle.borderRadius || "0.375rem";
			setBorderRadius(radius);
		}
	}, []);

	React.useEffect(() => {
		const controls = animate(rotation, 360, {
			duration: 3,
			repeat: Number.POSITIVE_INFINITY,
			ease: "linear",
		});

		return controls.stop;
	}, [rotation]);

	const gradient = useTransform(
		rotation,
		(value) =>
			`conic-gradient(from ${value}deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.2) 45%, rgba(59, 130, 246, 0.6) 50%, rgba(236, 72, 153, 1) 65%, rgba(249, 115, 22, 1) 80%, rgba(249, 115, 22, 1) 100%)`,
	);

	const handleClick = (
		event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		onClick?.(event);
	};

	return (
		<motion.button
			ref={buttonRef}
			className={cn(
				"group relative inline-flex cursor-pointer overflow-hidden rounded-md bg-zinc-900 dark:bg-zinc-100",
				className,
			)}
			whileTap={{
				scale: 0.98,
			}}
			onClick={handleClick}
			{...props}
		>
			{/* Animated gradient border - rotating continuously, positioned inside */}
			<motion.span
				className="absolute inset-0"
				style={{
					background: gradient,
					mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
					maskComposite: "exclude",
					padding: "2px",
					borderRadius: borderRadius,
					WebkitMask:
						"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
					WebkitMaskComposite: "xor",
				}}
			/>

			{/* Content - Secondary button style with solid background */}
			<span
				className={cn(
					"relative z-10 flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-50 dark:text-zinc-900 overflow-hidden",
					innerClassName,
				)}
			>
				{children}
			</span>
		</motion.button>
	);
}

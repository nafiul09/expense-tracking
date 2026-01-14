"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { Input } from "@ui/components/input";

interface SearchTriggerProps {
	onClick?: () => void;
	className?: string;
}

export function SearchTrigger({ onClick, className }: SearchTriggerProps) {
	return (
		<div
			className={cn(
				"relative group-data-[collapsible=icon]:hidden",
				className,
			)}
		>
			<div className="relative">
				<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sidebar-foreground/50 pointer-events-none z-10" />
				<Input
					type="text"
					placeholder="Search..."
					readOnly
					onClick={onClick}
					className={cn(
						"pl-9 pr-20 h-9 w-full cursor-pointer",
						"bg-sidebar-accent/50 border-sidebar-border",
						"hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-sidebar-ring",
						"text-sidebar-foreground placeholder:text-sidebar-foreground/50",
					)}
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
					<kbd className="hidden h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar-accent px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/70 opacity-100 sm:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				</div>
			</div>
		</div>
	);
}

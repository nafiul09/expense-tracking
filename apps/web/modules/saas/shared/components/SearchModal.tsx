"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
} from "@ui/components/command";
import { cn } from "@ui/lib";

interface SearchModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
	const [searchQuery, setSearchQuery] = React.useState("");

	// Reset search query when modal closes
	React.useEffect(() => {
		if (!open) {
			setSearchQuery("");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogHeader className="sr-only">
				<DialogTitle>Search</DialogTitle>
				<DialogDescription>Search</DialogDescription>
			</DialogHeader>
			<DialogContent
				className={cn(
					"overflow-hidden p-0 max-w-2xl [&>button]:hidden",
				)}
			>
				<Command
					shouldFilter={false}
					className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-0 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-1 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:pr-11 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:text-base [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 p-4"
				>
					<CommandInput
						placeholder="Search..."
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}

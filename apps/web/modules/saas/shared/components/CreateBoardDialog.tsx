"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CreateBoardDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({
	open,
	onOpenChange,
}: CreateBoardDialogProps) {
	const t = useTranslations();
	const [boardName, setBoardName] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// TODO: Implement board creation logic
		console.log("Creating board:", boardName);
		setBoardName("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("app.menu.createBoard")}</DialogTitle>
					<DialogDescription>
						Create a new board to organize your tasks and ideas.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="board-name">Board Name</Label>
							<Input
								id="board-name"
								value={boardName}
								onChange={(e) => setBoardName(e.target.value)}
								placeholder="Enter board name"
								required
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Create</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

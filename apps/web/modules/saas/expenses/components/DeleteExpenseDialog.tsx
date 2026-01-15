"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface DeleteExpenseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	expenseId: string;
	businessId: string;
}

export function DeleteExpenseDialog({
	open,
	onOpenChange,
	expenseId,
	businessId,
}: DeleteExpenseDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const handleDelete = async () => {
		try {
			await expensesApi.expenses.delete(expenseId);
			toast.success(t("expenses.deleted"));
			queryClient.invalidateQueries({
				queryKey: ["expenses", businessId],
			});
			onOpenChange(false);
		} catch (error) {
			toast.error(t("expenses.deleteError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("expenses.delete")}</DialogTitle>
					<DialogDescription>
						{t("expenses.deleteDescription")}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button variant="destructive" onClick={handleDelete}>
						{t("common.delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

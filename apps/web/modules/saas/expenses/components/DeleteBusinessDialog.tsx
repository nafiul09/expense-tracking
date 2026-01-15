"use client";

import { expensesApi } from "@saas/expenses/lib/api";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface DeleteBusinessDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessId: string;
	organizationId: string;
	businessName: string;
}

export function DeleteBusinessDialog({
	open,
	onOpenChange,
	businessId,
	organizationId,
	businessName,
}: DeleteBusinessDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();

	const handleDelete = async () => {
		try {
			await expensesApi.businesses.delete(businessId);
			toast.success(t("expenses.expenseAccounts.deleted"));
			queryClient.invalidateQueries({
				queryKey: ["businesses", organizationId],
			});
			onOpenChange(false);
			// Redirect to expenses page after deletion
			if (activeOrganization?.slug) {
				router.push(`/${activeOrganization.slug}/expenses`);
			}
		} catch (error) {
			toast.error(t("expenses.expenseAccounts.deleteError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("expenses.expenseAccounts.delete")}</DialogTitle>
					<DialogDescription>
						{t("expenses.expenseAccounts.deleteDescription", {
							businessName,
						})}
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

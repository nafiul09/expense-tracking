"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { config } from "@repo/config";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	currency: z.string().default("USD"),
	type: z.enum(["personal", "business"]).default("business"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateBusinessDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

export function CreateBusinessDialog({
	open,
	onOpenChange,
	organizationId,
}: CreateBusinessDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: currencyRates } = useQuery({
		queryKey: ["currencyRates", organizationId],
		queryFn: () => expensesApi.currencies.list(organizationId),
		enabled: open,
	});

	// Get available currencies: USD (base) + currencies with configured rates
	const availableCurrencies = [
		config.expenses.defaultBaseCurrency,
		...(currencyRates?.map((rate) => rate.toCurrency) || []),
	];

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			name: "",
			description: "",
			currency: "USD",
			type: "business",
		},
	});

	const onSubmit = async (values: FormValues) => {
		try {
			await expensesApi.businesses.create({
				organizationId,
				...values,
			});

			toast.success(t("expenses.expenseAccounts.created"));
			queryClient.invalidateQueries({
				queryKey: ["businesses", organizationId],
			});
			form.reset();
			onOpenChange(false);
		} catch (error) {
			toast.error(t("expenses.expenseAccounts.createError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("expenses.expenseAccounts.create")}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.expenseAccounts.createDescription")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.expenseAccounts.name")}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"expenses.expenseAccounts.description",
										)}
									</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.expenseAccounts.type")}
										</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="personal">
													{t(
														"expenses.expenseAccounts.types.personal",
													)}
												</SelectItem>
												<SelectItem value="business">
													{t(
														"expenses.expenseAccounts.types.business",
													)}
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="currency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.expenseAccounts.currency",
											)}
										</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{availableCurrencies.map(
													(currency) => (
														<SelectItem
															key={currency}
															value={currency}
														>
															{currency}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								{t("common.cancel")}
							</Button>
							<Button type="submit">{t("common.create")}</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

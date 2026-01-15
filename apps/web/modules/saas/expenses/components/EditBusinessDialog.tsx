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
import { useEffect } from "react";
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

interface EditBusinessDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessId: string;
	organizationId: string;
}

export function EditBusinessDialog({
	open,
	onOpenChange,
	businessId,
	organizationId,
}: EditBusinessDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
		enabled: open && !!businessId,
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencyRates", organizationId],
		queryFn: () => expensesApi.currencies.list(organizationId),
		enabled: open,
	});

	// Get available currencies: USD (base) + currencies with configured rates
	// Also include the current business currency if it exists (to allow keeping it)
	const baseCurrencies = [
		config.expenses.defaultBaseCurrency,
		...(currencyRates?.map((rate) => rate.toCurrency) || []),
	];
	const availableCurrencies =
		business?.currency && !baseCurrencies.includes(business.currency)
			? [...baseCurrencies, business.currency]
			: baseCurrencies;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			name: "",
			description: "",
			currency: "USD",
			type: "business",
		},
	});

	useEffect(() => {
		if (business) {
			form.reset({
				name: business.name,
				description: business.description || "",
				currency: business.currency,
				type: business.type as "personal" | "business",
			});
		}
	}, [business, form]);

	const onSubmit = async (values: FormValues) => {
		try {
			await expensesApi.businesses.update({
				id: businessId,
				...values,
			});

			toast.success(t("expenses.expenseAccounts.updated"));
			queryClient.invalidateQueries({
				queryKey: ["businesses", organizationId],
			});
			queryClient.invalidateQueries({
				queryKey: ["business", businessId],
			});
			onOpenChange(false);
		} catch (error) {
			toast.error(t("expenses.expenseAccounts.updateError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("expenses.expenseAccounts.edit")}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.expenseAccounts.editDescription")}
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
											value={field.value}
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
											value={field.value}
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
							<Button type="submit">{t("common.save")}</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

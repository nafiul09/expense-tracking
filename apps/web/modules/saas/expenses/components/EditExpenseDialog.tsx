"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	amount: z.number().positive(),
	currency: z.string().default("USD"),
	date: z.coerce.date(),
	categoryId: z.string().min(1),
	teamMemberId: z.string().optional(),
	paymentMethodId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditExpenseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	expenseId: string;
	businessId: string;
}

export function EditExpenseDialog({
	open,
	onOpenChange,
	expenseId,
	businessId,
}: EditExpenseDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: expense } = useQuery({
		queryKey: ["expense", expenseId],
		queryFn: () => expensesApi.expenses.getDetails(expenseId),
		enabled: open && !!expenseId,
	});

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: categories } = useQuery({
		queryKey: ["categories", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.categories.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const { data: paymentMethods } = useQuery({
		queryKey: ["paymentMethods", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.paymentMethods.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const { data: teamMembers } = useQuery({
		queryKey: ["teamMembers", businessId],
		queryFn: () => expensesApi.teamMembers.list(businessId),
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			title: "",
			description: "",
			amount: 0,
			currency: "USD",
			date: new Date(),
			categoryId: "",
			teamMemberId: "__none__",
			paymentMethodId: "__none__",
		},
	});

	// Check if expense is linked to subscription or is one-time
	const isSubscriptionExpense = !!expense?.subscriptionId;
	const categoryName = expense?.category?.name.toLowerCase() || "";
	const isOneTimeExpense =
		categoryName.includes("one-time") ||
		categoryName.includes("one time") ||
		categoryName === "one-time";

	useEffect(() => {
		if (expense) {
			form.reset({
				title: expense.title,
				description: expense.description || "",
				amount: Number(expense.amount),
				currency: expense.currency,
				date: new Date(expense.date),
				categoryId: expense.categoryId || undefined,
				teamMemberId: expense.teamMemberId || "__none__",
				paymentMethodId: expense.paymentMethodId || "__none__",
			});
		}
	}, [expense, form]);

	const onSubmit = async (values: FormValues) => {
		try {
			// For subscription and one-time expenses, only update allowed fields
			const updateData: any = {
				id: expenseId,
				title: values.title,
				description: values.description,
				amount: values.amount,
				date: values.date,
			};

			// Only include category, teamMember, paymentMethod if not subscription/one-time
			if (!isSubscriptionExpense && !isOneTimeExpense) {
				updateData.categoryId = values.categoryId;
				updateData.teamMemberId =
					values.teamMemberId && values.teamMemberId !== "__none__"
						? values.teamMemberId
						: null;
				updateData.paymentMethodId =
					values.paymentMethodId &&
					values.paymentMethodId !== "__none__"
						? values.paymentMethodId
						: null;
			}

			await expensesApi.expenses.update(updateData);

			toast.success(t("expenses.updated"));
			queryClient.invalidateQueries({
				queryKey: ["expenses", businessId],
			});
			queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
			onOpenChange(false);
		} catch (error) {
			toast.error(t("expenses.updateError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("expenses.edit")}</DialogTitle>
					<DialogDescription>
						{isSubscriptionExpense
							? t(
									"expenses.editSubscriptionExpenseDescription",
								) ||
								"You can only edit title, amount, date, and description for subscription expenses."
							: isOneTimeExpense
								? t("expenses.editOneTimeExpenseDescription") ||
									"You can only edit title, amount, date, and description for one-time expenses."
								: t("expenses.editDescription")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.form.title")}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="amount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.amount")}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? Number.parseFloat(
																	e.target
																		.value,
																)
															: 0,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="date"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.date")}
										</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												value={
													field.value
														? new Date(field.value)
																.toISOString()
																.split("T")[0]
														: ""
												}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? new Date(
																	e.target
																		.value,
																)
															: new Date(),
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="categoryId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.form.category")}
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
											{categories?.map((category) => (
												<SelectItem
													key={category.id}
													value={category.id}
												>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="teamMemberId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.teamMember")}
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
												<SelectItem value="__none__">
													{t("common.none")}
												</SelectItem>
												{teamMembers?.map((member) => (
													<SelectItem
														key={member.id}
														value={member.id}
													>
														{member.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="paymentMethodId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.paymentMethod")}
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
												<SelectItem value="__none__">
													{t("common.none")}
												</SelectItem>
												{paymentMethods?.map(
													(method) => (
														<SelectItem
															key={method.id}
															value={method.id}
														>
															{method.name}
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

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.form.description")}
									</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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

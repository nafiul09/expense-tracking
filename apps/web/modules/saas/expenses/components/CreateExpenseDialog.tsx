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
import { Label } from "@ui/components/label";
import { RadioGroup, RadioGroupItem } from "@ui/components/radio-group";
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
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	amount: z.number().positive(),
	currency: z.string().default("USD"),
	rateType: z.enum(["default", "custom"]).default("default").optional(),
	customRate: z.number().positive().optional(),
	date: z.coerce.date(),
	categoryId: z.string().min(1),
	teamMemberId: z.string().optional(),
	paymentMethodId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateExpenseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessId: string;
}

export function CreateExpenseDialog({
	open,
	onOpenChange,
	businessId,
}: CreateExpenseDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

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

	const { data: currencyRates } = useQuery({
		queryKey: ["currencyRates", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			description: "",
			amount: 0,
			currency: business?.currency || "USD",
			rateType: "default",
			customRate: undefined,
			date: new Date(),
			categoryId: "",
			teamMemberId: "__none__",
			paymentMethodId: "__none__",
		},
	});

	const onSubmit = async (values: FormValues) => {
		try {
			await expensesApi.expenses.create({
				businessId,
				...values,
				rateType: values.rateType,
				customRate:
					values.rateType === "custom"
						? values.customRate
						: undefined,
				teamMemberId:
					values.teamMemberId && values.teamMemberId !== "__none__"
						? values.teamMemberId
						: undefined,
				paymentMethodId:
					values.paymentMethodId &&
					values.paymentMethodId !== "__none__"
						? values.paymentMethodId
						: undefined,
			});

			toast.success(t("expenses.created"));
			queryClient.invalidateQueries({
				queryKey: ["expenses", businessId],
			});
			form.reset();
			onOpenChange(false);
		} catch (error) {
			toast.error(t("expenses.createError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("expenses.create")}</DialogTitle>
					<DialogDescription>
						{t("expenses.createDescription")}
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
												onChange={(e) =>
													field.onChange(
														Number.parseFloat(
															e.target.value,
														),
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
														new Date(
															e.target.value,
														),
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="currency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.currency")}
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
												{config.expenses.supportedCurrencies.map(
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

						{form.watch("currency") !==
							config.expenses.defaultBaseCurrency && (
							<div className="space-y-4 rounded-lg border p-4">
								<FormField
									control={form.control}
									name="rateType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("expenses.form.rateType")}
											</FormLabel>
											<FormControl>
												<RadioGroup
													onValueChange={
														field.onChange
													}
													defaultValue={field.value}
													className="flex gap-6"
												>
													<div className="flex items-center space-x-2">
														<RadioGroupItem
															value="default"
															id="rate-default"
														/>
														<Label htmlFor="rate-default">
															{t(
																"expenses.form.useDefaultRate",
															)}
															{currencyRates && (
																<span className="text-muted-foreground ml-2 text-sm">
																	(
																	{Number(
																		currencyRates.find(
																			(
																				r,
																			) =>
																				r.toCurrency ===
																				form.watch(
																					"currency",
																				),
																		)
																			?.rate ||
																			0,
																	).toFixed(
																		4,
																	)}
																	)
																</span>
															)}
														</Label>
													</div>
													<div className="flex items-center space-x-2">
														<RadioGroupItem
															value="custom"
															id="rate-custom"
														/>
														<Label htmlFor="rate-custom">
															{t(
																"expenses.form.useCustomRate",
															)}
														</Label>
													</div>
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{form.watch("rateType") === "custom" && (
									<FormField
										control={form.control}
										name="customRate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t(
														"expenses.form.customRate",
													)}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.0001"
														{...field}
														value={
															field.value || ""
														}
														onChange={(e) =>
															field.onChange(
																e.target.value
																	? Number.parseFloat(
																			e
																				.target
																				.value,
																		)
																	: undefined,
															)
														}
														placeholder="1.0000"
													/>
												</FormControl>
												<p className="text-muted-foreground text-xs">
													{t(
														"expenses.form.customRateHint",
														{
															baseCurrency:
																config.expenses
																	.defaultBaseCurrency,
															currency:
																form.watch(
																	"currency",
																),
														},
													)}
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

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
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"expenses.form.selectCategory",
													)}
												/>
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
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={t(
															"expenses.form.selectTeamMember",
														)}
													/>
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
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={t(
															"expenses.form.selectPaymentMethod",
														)}
													/>
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
							<Button type="submit">{t("common.create")}</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

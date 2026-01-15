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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	provider: z.string().optional(),
	currentAmount: z.number().positive(),
	currency: z.string().min(1),
	rateType: z.enum(["default", "custom"]).default("default").optional(),
	customRate: z.number().positive().optional(),
	startDate: z.coerce.date(),
	renewalFrequency: z
		.enum(["monthly", "yearly", "weekly"])
		.default("monthly"),
	renewalType: z
		.enum(["from_payment_date", "from_renewal_date"])
		.default("from_payment_date"),
	autoRenew: z.boolean().default(true),
	reminderDays: z.number().int().min(1).max(30).default(7),
	paymentMethodId: z.string().optional(),
	categoryId: z.string().min(1), // Required for auto-creating expenses
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSubscriptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessId: string;
}

export function CreateSubscriptionDialog({
	open,
	onOpenChange,
	businessId,
}: CreateSubscriptionDialogProps) {
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

	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
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

	// Find subscription category
	const subscriptionCategory = categories?.find(
		(cat) =>
			cat.name.toLowerCase().includes("subscription") ||
			cat.name.toLowerCase().includes("recurring"),
	);

	// Get available currencies: USD + workspace currencies
	const availableCurrencies = ["USD"];
	if (currencyRates) {
		for (const rate of currencyRates) {
			if (!availableCurrencies.includes(rate.toCurrency)) {
				availableCurrencies.push(rate.toCurrency);
			}
		}
	}

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			title: "",
			description: "",
			provider: "",
			currentAmount: 0,
			currency: business?.currency || "USD",
			rateType: "default",
			customRate: undefined,
			startDate: new Date(),
			renewalFrequency: "monthly",
			renewalType: "from_payment_date",
			autoRenew: true,
			reminderDays: 7,
			paymentMethodId: undefined,
			categoryId: subscriptionCategory?.id || "",
		},
	});

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			form.reset({
				title: "",
				description: "",
				provider: "",
				currentAmount: 0,
				currency: business?.currency || "USD",
				rateType: "default",
				customRate: undefined,
				startDate: new Date(),
				renewalFrequency: "monthly",
				renewalType: "from_payment_date",
				autoRenew: true,
				reminderDays: 7,
				paymentMethodId: undefined,
				categoryId: subscriptionCategory?.id || "",
			});
		}
	}, [open, business?.currency, subscriptionCategory?.id, form]);

	// Set currency default when business data loads
	useEffect(() => {
		if (
			business?.currency &&
			form.getValues("currency") !== business.currency
		) {
			form.setValue("currency", business.currency);
		}
	}, [business?.currency, form]);

	const onSubmit = async (values: FormValues) => {
		try {
			await expensesApi.subscriptions.createStandalone({
				expenseAccountId: businessId,
				categoryId: values.categoryId,
				title: values.title,
				description: values.description,
				provider: values.provider,
				currentAmount: values.currentAmount,
				currency: values.currency,
				rateType: values.rateType,
				customRate:
					values.rateType === "custom"
						? values.customRate
						: undefined,
				startDate: values.startDate,
				renewalFrequency: values.renewalFrequency,
				renewalType: values.renewalType,
				autoRenew: values.autoRenew,
				reminderDays: values.reminderDays,
				paymentMethodId:
					values.paymentMethodId &&
					values.paymentMethodId !== "__none__"
						? values.paymentMethodId
						: undefined,
				status: "active",
			});

			toast.success(
				t("expenses.subscriptions.created") ||
					"Subscription created successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["subscriptions", businessId],
			});
			queryClient.invalidateQueries({
				queryKey: ["expenses", businessId],
			});
			form.reset();
			onOpenChange(false);
		} catch (error) {
			toast.error(
				t("expenses.subscriptions.createError") ||
					"Failed to create subscription",
			);
			console.error(error);
		}
	};

	if (!subscriptionCategory) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("expenses.subscriptions.create")}
						</DialogTitle>
						<DialogDescription>
							{t("expenses.subscriptions.categoryNotFound") ||
								"Subscription category not found. Please create a subscription category first."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t("common.close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	const selectedCurrency = form.watch("currency");
	const amountValue = form.watch("currentAmount");
	const rateType = form.watch("rateType");
	const customRate = form.watch("customRate");
	const accountCurrency = business?.currency || "USD";

	// Calculate conversion display
	const calculateConversion = () => {
		if (!amountValue || selectedCurrency === accountCurrency) {
			return null;
		}

		let amountInUSD = amountValue;

		// Step 1: Convert to USD
		if (selectedCurrency !== "USD") {
			if (rateType === "custom" && customRate) {
				amountInUSD = amountValue * Number(customRate);
			} else {
				const rate = currencyRates?.find(
					(r) => r.toCurrency === selectedCurrency,
				)?.rate;
				if (rate) {
					amountInUSD = amountValue / Number(rate);
				}
			}
		}

		// Step 2: Convert USD to account currency
		if (accountCurrency === "USD") {
			return {
				amountInUSD,
				finalAmount: amountInUSD,
				showConversion: selectedCurrency !== "USD",
			};
		}

		const usdToAccountRate = currencyRates?.find(
			(r) => r.toCurrency === accountCurrency,
		)?.rate;

		if (!usdToAccountRate) {
			return null;
		}

		const finalAmount = amountInUSD * Number(usdToAccountRate);

		return {
			amountInUSD,
			finalAmount,
			showConversion: true,
		};
	};

	const conversionData = calculateConversion();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("expenses.subscriptions.create") ||
							"Create Subscription"}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.subscriptions.createDescription") ||
							"Create a new subscription. If start date is today or past, an expense will be created automatically."}
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
										{t(
											"expenses.subscriptions.table.title",
										)}
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
										{t("expenses.form.description")}
									</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="provider"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"expenses.subscriptions.table.provider",
										)}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="currentAmount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.currentAmount",
											)}
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
								name="currency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.currency")}
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
															{currency ===
																accountCurrency &&
																` (${t("common.default")})`}
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

						{/* Currency conversion display */}
						{conversionData?.showConversion && amountValue > 0 && (
							<div className="bg-muted rounded-md p-3 text-sm">
								<div className="font-medium mb-2">
									{t("expenses.form.conversionBreakdown") ||
										"Conversion Breakdown"}
								</div>
								<div className="space-y-1 text-muted-foreground">
									{selectedCurrency !== "USD" && (
										<div>
											{amountValue} {selectedCurrency} ={" "}
											{conversionData.amountInUSD.toFixed(
												2,
											)}{" "}
											USD
										</div>
									)}
									{accountCurrency !== "USD" && (
										<div>
											{conversionData.amountInUSD.toFixed(
												2,
											)}{" "}
											USD ={" "}
											{conversionData.finalAmount.toFixed(
												2,
											)}{" "}
											{accountCurrency}
										</div>
									)}
									<div className="border-muted-foreground/20 mt-2 border-t pt-2 font-medium text-foreground">
										{t("expenses.form.recordedAs") ||
											"Will be recorded as"}
										:{" "}
										{conversionData.finalAmount.toFixed(2)}{" "}
										{accountCurrency}
									</div>
								</div>
							</div>
						)}

						{/* Conversion rate options */}
						{selectedCurrency !== accountCurrency && (
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
													value={field.value}
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
															{currencyRates &&
																selectedCurrency !==
																	"USD" && (
																	<span className="text-muted-foreground ml-2 text-sm">
																		(1{" "}
																		{
																			selectedCurrency
																		}{" "}
																		={" "}
																		{Number(
																			currencyRates.find(
																				(
																					r,
																				) =>
																					r.toCurrency ===
																					selectedCurrency,
																			)
																				?.rate ||
																				0,
																		).toFixed(
																			4,
																		)}{" "}
																		USD)
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
													1 {selectedCurrency} = ? USD
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.startDate",
											) || "Start Date"}
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

							<FormField
								control={form.control}
								name="renewalFrequency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.table.frequency",
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
												<SelectItem value="monthly">
													{t(
														"expenses.subscriptions.frequency.monthly",
													)}
												</SelectItem>
												<SelectItem value="yearly">
													{t(
														"expenses.subscriptions.frequency.yearly",
													)}
												</SelectItem>
												<SelectItem value="weekly">
													Weekly
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="renewalType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"expenses.subscriptions.renewalType.label",
										) || "Renewal Type"}
									</FormLabel>
									<FormControl>
										<RadioGroup
											onValueChange={field.onChange}
											value={field.value}
											className="flex gap-6"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="from_payment_date"
													id="renewal-payment"
												/>
												<Label htmlFor="renewal-payment">
													{t(
														"expenses.subscriptions.renewalType.fromPaymentDate",
													) || "From Payment Date"}
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="from_renewal_date"
													id="renewal-renewal"
												/>
												<Label htmlFor="renewal-renewal">
													{t(
														"expenses.subscriptions.renewalType.fromRenewalDate",
													) || "From Renewal Date"}
												</Label>
											</div>
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="reminderDays"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.reminderDays",
											) || "Reminder Days Before Renewal"}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min="1"
												max="30"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? Number.parseInt(
																	e.target
																		.value,
																	10,
																)
															: 7,
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
								name="paymentMethodId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.paymentMethod")}
										</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value || "__none__"}
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

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								{t("common.cancel")}
							</Button>
							<Button type="submit">
								{t("expenses.subscriptions.create") ||
									"Create Subscription"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

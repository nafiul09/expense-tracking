"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatAmountWithOriginal, formatCurrency } from "@repo/utils";
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
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	categoryId: z.string().min(1),
	title: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	amount: z.number().positive(),
	currency: z.string().min(1).optional(),
	rateType: z.enum(["default", "custom"]).default("default").optional(),
	customRate: z.number().positive().optional(),
	date: z.coerce.date(),
	paymentMethodId: z.string().optional(),
	// Conditional: Subscription fields
	subscriptionId: z.string().optional(), // Link to existing subscription
	amountType: z.enum(["default", "custom"]).optional(), // For subscription expenses: default uses subscription amount, custom allows different amount/currency
	// Conditional: Team Salary fields
	teamMemberId: z.string().optional(),
	salaryType: z.enum(["default", "custom"]).optional(),
	salaryMonth: z
		.string()
		.regex(/^\d{4}-\d{2}$/)
		.optional(), // Format: YYYY-MM
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
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			categoryId: "",
			title: "",
			description: "",
			amount: 0,
			currency: business?.currency || "USD",
			rateType: "default",
			customRate: undefined,
			date: new Date(),
			teamMemberId: "__none__",
			paymentMethodId: "__none__",
			subscriptionId: undefined,
			amountType: "default",
			salaryType: undefined,
			salaryMonth: undefined,
		},
	});

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			form.reset({
				categoryId: "",
				title: "",
				description: "",
				amount: 0,
				currency: business?.currency || "USD",
				rateType: "default",
				customRate: undefined,
				date: new Date(),
				teamMemberId: "__none__",
				paymentMethodId: "__none__",
				subscriptionId: undefined,
				amountType: "default",
				salaryType: undefined,
				salaryMonth: undefined,
			});
			// Clear any old subscription-related fields that no longer exist in schema
			form.setValue("renewalFrequency" as any, undefined);
			form.setValue("renewalDate" as any, undefined);
			form.setValue("provider" as any, undefined);
		}
	}, [open, business?.currency, form]);

	// Update currency default when business data loads
	useEffect(() => {
		if (
			business?.currency &&
			form.getValues("currency") !== business.currency
		) {
			form.setValue("currency", business.currency);
		}
	}, [business?.currency, form]);

	// Watch category to determine which fields to show
	const selectedCategoryId = form.watch("categoryId");
	const selectedCategory = categories?.find(
		(c) => c.id === selectedCategoryId,
	);
	const categoryName = selectedCategory?.name.toLowerCase() || "";

	const isSubscription =
		categoryName.includes("subscription") ||
		categoryName === "subscription";
	const isTeamSalary =
		categoryName.includes("team salary") ||
		categoryName.includes("salary") ||
		categoryName === "team salary";
	const isOneTime =
		categoryName.includes("one-time") ||
		categoryName.includes("one time") ||
		categoryName === "one-time";

	// Fetch subscriptions when category is Subscription
	const { data: subscriptions } = useQuery({
		queryKey: ["subscriptions", businessId],
		queryFn: () => expensesApi.subscriptions.list({ businessId }),
		enabled: !!businessId && isSubscription,
	});

	// Watch subscription for auto-filling amount and title
	const selectedSubscriptionId = form.watch("subscriptionId");
	const selectedSubscription = subscriptions?.find(
		(s) => s.id === selectedSubscriptionId,
	);
	const amountType = form.watch("amountType");

	// Auto-fill amount and title when subscription is selected (if default amount)
	useEffect(() => {
		if (
			isSubscription &&
			selectedSubscription &&
			amountType === "default"
		) {
			form.setValue(
				"amount",
				Number(selectedSubscription.currentAmount || 0),
			);
			if (!form.getValues("title")) {
				form.setValue("title", selectedSubscription.title);
			}
			form.setValue(
				"currency",
				selectedSubscription.currency || business?.currency || "USD",
			);
		}
	}, [
		selectedSubscription,
		amountType,
		isSubscription,
		business?.currency,
		form,
	]);

	// Watch team member for auto-filling salary
	const selectedTeamMemberId = form.watch("teamMemberId");
	const selectedTeamMember = teamMembers?.find(
		(m) =>
			m.id === selectedTeamMemberId &&
			selectedTeamMemberId !== "__none__",
	);

	// Auto-fill amount when team member or salary type changes
	const salaryType = form.watch("salaryType");
	const watchedTeamMemberId = form.watch("teamMemberId");

	// Calculate currency conversion display
	const selectedCurrency = form.watch("currency");
	const accountCurrency = business?.currency || "USD";
	const amountValue = form.watch("amount");
	const rateType = form.watch("rateType");
	const customRate = form.watch("customRate");

	// Get available currencies: USD + workspace currencies
	const availableCurrencies = ["USD"];
	if (currencyRates) {
		for (const rate of currencyRates) {
			if (!availableCurrencies.includes(rate.toCurrency)) {
				availableCurrencies.push(rate.toCurrency);
			}
		}
	}

	// Calculate multi-step conversion: Input Currency -> USD -> Account Currency
	const calculateConversion = () => {
		if (!amountValue || selectedCurrency === accountCurrency) {
			return null;
		}

		let amountInUSD = amountValue;

		// Step 1: Convert input currency to USD (if not already USD)
		if (selectedCurrency !== "USD") {
			const inputToUSDRate =
				rateType === "custom"
					? customRate
					: currencyRates?.find(
							(r) => r.toCurrency === selectedCurrency,
						)?.rate;

			if (!inputToUSDRate) {
				return null;
			}
			amountInUSD = amountValue * Number(inputToUSDRate);
		}

		// Step 2: Convert USD to account currency (if not already USD)
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

	const onSubmit = async (values: FormValues) => {
		try {
			// Prepare data based on category type
			const expenseData: any = {
				businessId,
				categoryId: values.categoryId,
				title: values.title || `${selectedCategory?.name} Expense`,
				description: values.description,
				amount: values.amount,
				currency: values.currency,
				rateType: values.rateType,
				customRate:
					values.rateType === "custom"
						? values.customRate
						: undefined,
				date: values.date,
				paymentMethodId:
					values.paymentMethodId &&
					values.paymentMethodId !== "__none__"
						? values.paymentMethodId
						: undefined,
			};

			// Add conditional fields
			if (
				isTeamSalary &&
				values.teamMemberId &&
				values.teamMemberId !== "__none__"
			) {
				expenseData.teamMemberId = values.teamMemberId;
				expenseData.salaryType = values.salaryType;
				expenseData.salaryMonth = values.salaryMonth;
				// For team salary, set date to first day of the selected month
				if (values.salaryMonth) {
					expenseData.date = new Date(values.salaryMonth + "-01");
				}
			}

			if (isSubscription && values.subscriptionId) {
				expenseData.subscriptionId = values.subscriptionId;
				// If custom amount, allow updating subscription amount
				if (values.amountType === "custom") {
					expenseData.updateSubscriptionAmount = true;
				}
			}

			await expensesApi.expenses.create(expenseData);

			toast.success(t("expenses.created"));
			queryClient.invalidateQueries({
				queryKey: ["expenses", businessId],
			});
			queryClient.invalidateQueries({
				queryKey: ["subscriptions", businessId],
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
						{/* Category Selection - Must be first */}
						<FormField
							control={form.control}
							name="categoryId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.form.categoryType") ||
											t("expenses.form.category")}
									</FormLabel>
									<Select
										onValueChange={(value) => {
											field.onChange(value);
											// Reset conditional fields when category changes
											form.setValue(
												"teamMemberId",
												"__none__",
											);
											form.setValue(
												"salaryType",
												undefined,
											);
											form.setValue(
												"salaryMonth",
												undefined,
											);
											form.setValue("amount", 0);
										}}
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

						{/* Title - Required for Subscription and One-Time, Optional for Team Salary */}
						{(isSubscription || isOneTime) && (
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
						)}

						{/* Team Member - Required for Team Salary */}
						{isTeamSalary && (
							<FormField
								control={form.control}
								name="teamMemberId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.teamMember")}
										</FormLabel>
										<Select
											onValueChange={(value) => {
												field.onChange(value);
												// Auto-fill amount if default salary type
												if (
													value !== "__none__" &&
													salaryType === "default"
												) {
													const member =
														teamMembers?.find(
															(m) =>
																m.id === value,
														);
													if (member) {
														const accountSalary =
															member.accounts?.find(
																(acc) =>
																	acc.accountId ===
																	businessId,
															)?.salary;
														const defaultSalary =
															accountSalary ||
															member.salary ||
															0;
														if (
															Number(
																defaultSalary,
															) > 0
														) {
															form.setValue(
																"amount",
																Number(
																	defaultSalary,
																),
															);
														}
													}
												}
											}}
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
						)}

						{/* Salary Type - Only for Team Salary */}
						{isTeamSalary && (
							<FormField
								control={form.control}
								name="salaryType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.salaryType")}
										</FormLabel>
										<FormControl>
											<RadioGroup
												onValueChange={(value) => {
													field.onChange(value);
													// Auto-fill amount if default
													if (
														value === "default" &&
														watchedTeamMemberId !==
															"__none__"
													) {
														const member =
															teamMembers?.find(
																(m) =>
																	m.id ===
																	watchedTeamMemberId,
															);
														if (member) {
															const accountSalary =
																member.accounts?.find(
																	(acc) =>
																		acc.accountId ===
																		businessId,
																)?.salary;
															const defaultSalary =
																accountSalary ||
																member.salary ||
																0;
															if (
																Number(
																	defaultSalary,
																) > 0
															) {
																form.setValue(
																	"amount",
																	Number(
																		defaultSalary,
																	),
																);
															}
														}
													}
												}}
												defaultValue={field.value}
												className="flex gap-6"
											>
												<div className="flex items-center space-x-2">
													<RadioGroupItem
														value="default"
														id="salary-default"
													/>
													<Label htmlFor="salary-default">
														{t(
															"expenses.form.salaryTypeDefault",
														)}
														{selectedTeamMember &&
															(() => {
																const accountSalary =
																	selectedTeamMember.accounts?.find(
																		(acc) =>
																			acc.accountId ===
																			businessId,
																	)?.salary;
																const defaultSalary =
																	accountSalary ||
																	selectedTeamMember.salary ||
																	0;
																return (
																	<span className="text-muted-foreground ml-2 text-sm">
																		(
																		{formatCurrency(
																			Number(
																				defaultSalary,
																			),
																			accountCurrency,
																			currencyRates?.find(
																				(
																					r,
																				) =>
																					r.toCurrency ===
																					accountCurrency,
																			),
																		)}
																		)
																	</span>
																);
															})()}
													</Label>
												</div>
												<div className="flex items-center space-x-2">
													<RadioGroupItem
														value="custom"
														id="salary-custom"
													/>
													<Label htmlFor="salary-custom">
														{t(
															"expenses.form.salaryTypeCustom",
														)}
													</Label>
												</div>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Subscription Selector - Only for Subscription category */}
						{isSubscription && (
							<FormField
								control={form.control}
								name="subscriptionId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.selectSubscription",
											) || "Select Subscription"}
										</FormLabel>
										<Select
											onValueChange={(value) => {
												field.onChange(value);
												if (
													value &&
													value !== "__create_new__"
												) {
													const subscription =
														subscriptions?.find(
															(s) =>
																s.id === value,
														);
													if (
														subscription &&
														amountType === "default"
													) {
														form.setValue(
															"amount",
															Number(
																subscription.currentAmount ||
																	0,
															),
														);
														form.setValue(
															"title",
															subscription.title,
														);
														form.setValue(
															"currency",
															subscription.currency ||
																business?.currency ||
																"USD",
														);
													}
												} else if (
													value === "__create_new__"
												) {
													// User wants to create new subscription
													// Reset subscription selection
													field.onChange(undefined);
													// Note: User should create subscription from subscription tab
													toast.info(
														t(
															"expenses.subscriptions.createFromTab",
														) ||
															"Please create subscription from the Subscriptions tab first",
													);
												}
											}}
											value={field.value || ""}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={
															t(
																"expenses.subscriptions.selectSubscription",
															) ||
															"Select a subscription"
														}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="__create_new__">
													<PlusIcon className="mr-2 inline size-4" />
													{t(
														"expenses.subscriptions.createNew",
													) ||
														"Create New Subscription"}
												</SelectItem>
												{subscriptions?.map(
													(subscription) => (
														<SelectItem
															key={
																subscription.id
															}
															value={
																subscription.id
															}
														>
															{subscription.title}
															{subscription.status !==
																"active" && (
																<span className="text-muted-foreground ml-2 text-xs">
																	(
																	{
																		subscription.status
																	}
																	)
																</span>
															)}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Amount Type Toggle - Only for Subscription */}
						{isSubscription && selectedSubscriptionId && (
							<FormField
								control={form.control}
								name="amountType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.amountType") ||
												"Amount Type"}
										</FormLabel>
										<FormControl>
											<RadioGroup
												onValueChange={field.onChange}
												value={field.value || "default"}
												className="flex gap-6"
											>
												<div className="flex items-center space-x-2">
													<RadioGroupItem
														value="default"
														id="amount-default"
													/>
													<Label htmlFor="amount-default">
														{t(
															"expenses.form.useDefaultAmount",
														) || "Default Amount"}
														{selectedSubscription && (
															<span className="text-muted-foreground ml-2 text-sm">
																(
																{formatAmountWithOriginal(
																	Number(
																		selectedSubscription.currentAmount ||
																			0,
																	),
																	selectedSubscription.currency ||
																		accountCurrency,
																	accountCurrency,
																	currencyRates ||
																		[],
																	null,
																	null,
																)}
																)
															</span>
														)}
													</Label>
												</div>
												<div className="flex items-center space-x-2">
													<RadioGroupItem
														value="custom"
														id="amount-custom"
													/>
													<Label htmlFor="amount-custom">
														{t(
															"expenses.form.useCustomAmount",
														) || "Custom Amount"}
													</Label>
												</div>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Currency Field - Hide for subscription with default amount */}
						{!(
							isSubscription &&
							selectedSubscriptionId &&
							amountType === "default"
						) && (
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
						)}

						{/* Amount Field */}
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
																e.target.value,
															)
														: 0,
												)
											}
											disabled={
												!!(
													(isTeamSalary &&
														salaryType ===
															"default" &&
														watchedTeamMemberId !==
															"__none__") ||
													(isSubscription &&
														selectedSubscriptionId &&
														amountType ===
															"default")
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Date or Month Field */}
						{isTeamSalary ? (
							<FormField
								control={form.control}
								name="salaryMonth"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.form.salaryMonth") ||
												"Salary Month"}
										</FormLabel>
										<FormControl>
											<Input
												type="month"
												{...field}
												value={
													field.value ||
													new Date()
														.toISOString()
														.slice(0, 7)
												}
												onChange={(e) =>
													field.onChange(
														e.target.value,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						) : (
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
						)}

						{/* Conversion Rate Section - Only show if currency differs from account currency and not subscription default amount */}
						{conversionData?.showConversion &&
							!(
								isSubscription &&
								selectedSubscriptionId &&
								amountType === "default"
							) && (
								<div className="space-y-4 rounded-lg border p-4">
									<FormField
										control={form.control}
										name="rateType"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t(
														"expenses.form.rateType",
													)}
												</FormLabel>
												<FormControl>
													<RadioGroup
														onValueChange={
															field.onChange
														}
														defaultValue={
															field.value
														}
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
																field.value ||
																""
															}
															onChange={(e) =>
																field.onChange(
																	e.target
																		.value
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
														1 {selectedCurrency} = ?
														USD
													</p>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}

									{/* Show conversion breakdown */}
									{conversionData && amountValue > 0 && (
										<div className="bg-muted rounded-md p-3 text-sm">
											<div className="font-medium mb-2">
												{t(
													"expenses.form.conversionBreakdown",
												) || "Conversion Breakdown"}
											</div>
											<div className="space-y-1 text-muted-foreground">
												{selectedCurrency !== "USD" && (
													<div>
														{amountValue}{" "}
														{selectedCurrency} ={" "}
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
													{t(
														"expenses.form.recordedAs",
													) || "Will be recorded as"}
													:{" "}
													{conversionData.finalAmount.toFixed(
														2,
													)}{" "}
													{accountCurrency}
												</div>
											</div>
										</div>
									)}
								</div>
							)}

						{/* Subscription fields are now handled above with subscription selector */}

						{/* Payment Method - Show for Subscription and One-Time */}
						{(isSubscription || isOneTime) && (
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
						)}

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

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
	teamMemberId: z.string().min(1),
	amount: z.number().positive(),
	currency: z.string().min(1),
	rateType: z.enum(["default", "custom"]).default("default").optional(),
	customRate: z.number().positive().optional(),
	loanDate: z.coerce.date(),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateLoanDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessId: string;
}

export function CreateLoanDialog({
	open,
	onOpenChange,
	businessId,
}: CreateLoanDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
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
			teamMemberId: "",
			amount: 0,
			currency: business?.currency || "USD",
			rateType: "default",
			customRate: undefined,
			loanDate: new Date(),
			notes: "",
		},
	});

	// Get available currencies: USD + workspace currencies
	const availableCurrencies = ["USD"];
	if (currencyRates) {
		for (const rate of currencyRates) {
			if (!availableCurrencies.includes(rate.toCurrency)) {
				availableCurrencies.push(rate.toCurrency);
			}
		}
	}

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			form.reset({
				teamMemberId: "",
				amount: 0,
				currency: business?.currency || "USD",
				rateType: "default",
				customRate: undefined,
				loanDate: new Date(),
				notes: "",
			});
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

	// Calculate multi-step conversion: Input Currency -> USD -> Account Currency
	const selectedCurrency = form.watch("currency");
	const accountCurrency = business?.currency || "USD";
	const amountValue = form.watch("amount");
	const rateType = form.watch("rateType");
	const customRate = form.watch("customRate");

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
			await expensesApi.loans.createStandalone({
				teamMemberId: values.teamMemberId,
				businessId,
				amount: values.amount,
				currency: values.currency,
				rateType: values.rateType,
				customRate:
					values.rateType === "custom"
						? values.customRate
						: undefined,
				loanDate: values.loanDate,
				notes: values.notes,
			});

			toast.success(t("loans.messages.created"));
			queryClient.invalidateQueries({
				queryKey: ["loans", businessId],
			});
			queryClient.invalidateQueries({
				queryKey: ["teamMembers", businessId],
			});
			form.reset();
			onOpenChange(false);
		} catch (error) {
			toast.error(
				t("loans.messages.createError") || "Failed to create loan",
			);
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("loans.create")}</DialogTitle>
					<DialogDescription>
						{t("loans.form.createDescription") ||
							"Record a loan given to a team member"}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="teamMemberId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("loans.form.selectTeamMember")}
									</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"loans.form.selectTeamMember",
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

						{/* Currency Field */}
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

						{/* Amount Field */}
						<FormField
							control={form.control}
							name="amount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("loans.form.loanAmount")}
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
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Loan Date Field */}
						<FormField
							control={form.control}
							name="loanDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("loans.form.loanDate")}
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
																e.target.value,
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

						{/* Conversion Rate Section - Only show if currency differs from account currency */}
						{conversionData?.showConversion && (
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

						<FormField
							control={form.control}
							name="notes"
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

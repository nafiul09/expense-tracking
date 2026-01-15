"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency } from "@repo/utils";
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
	amount: z.number().positive(),
	currency: z.string().min(1),
	rateType: z.enum(["default", "custom"]).default("default").optional(),
	customRate: z.number().positive().optional(),
	paymentDate: z.coerce.date(),
	paymentType: z.enum(["payment", "disbursement"]).default("payment"),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RecordLoanPaymentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: string;
	businessId: string;
}

export function RecordLoanPaymentDialog({
	open,
	onOpenChange,
	loanId,
	businessId,
}: RecordLoanPaymentDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: loan } = useQuery({
		queryKey: ["loan", loanId],
		queryFn: () => expensesApi.loans.getStandaloneDetails(loanId),
		enabled: !!loanId && open,
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
			amount: 0,
			currency: loan?.currency || business?.currency || "USD",
			rateType: "default",
			customRate: undefined,
			paymentDate: new Date(),
			paymentType: "payment",
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
		if (open && loan) {
			form.reset({
				amount: 0,
				currency: loan.currency || business?.currency || "USD",
				rateType: "default",
				customRate: undefined,
				paymentDate: new Date(),
				paymentType: "payment",
				notes: "",
			});
		}
	}, [open, loan?.currency, business?.currency, form]);

	// Update currency default when loan data loads
	useEffect(() => {
		if (
			loan?.currency &&
			form.getValues("currency") !== loan.currency
		) {
			form.setValue("currency", loan.currency);
		} else if (
			business?.currency &&
			!loan?.currency &&
			form.getValues("currency") !== business.currency
		) {
			form.setValue("currency", business.currency);
		}
	}, [loan?.currency, business?.currency, form]);

	const currentBalance = loan ? Number(loan.currentBalance) : 0;
	const accountCurrency = business?.currency || "USD";
	const selectedCurrency = form.watch("currency");
	const amountValue = form.watch("amount");
	const rateType = form.watch("rateType");
	const customRate = form.watch("customRate");

	// Calculate multi-step conversion: Payment Currency → USD → Account Currency
	const calculateConversion = () => {
		if (!amountValue || selectedCurrency === accountCurrency) {
			return null;
		}

		let amountInUSD = amountValue;

		// Step 1: Convert payment currency to USD (if not already USD)
		if (selectedCurrency !== "USD") {
			if (rateType === "custom" && customRate) {
				// Custom rate: user provides "1 toCurrency = customRate USD"
				amountInUSD = amountValue * Number(customRate);
			} else {
				// Default rate from currencyRates: "1 USD = rate * toCurrency"
				// So to convert FROM toCurrency TO USD: divide
				const rate = currencyRates?.find(
					(r) => r.toCurrency === selectedCurrency,
				)?.rate;
				
				if (!rate) {
					return null;
				}
				amountInUSD = amountValue / Number(rate);
			}
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
	const convertedPaymentAmount = conversionData?.finalAmount || amountValue;

	const onSubmit = async (values: FormValues) => {
		// Recalculate conversion using form values
		let paymentAmountInUSD = values.amount;
		
		// Step 1: Convert payment currency to USD (if not already USD)
		if (values.currency !== "USD") {
			if (values.rateType === "custom" && values.customRate) {
				// Custom rate: user provides "1 toCurrency = customRate USD"
				paymentAmountInUSD = values.amount * Number(values.customRate);
			} else {
				// Default rate from currencyRates: "1 USD = rate * toCurrency"
				// So to convert FROM toCurrency TO USD: divide
				const rate = currencyRates?.find(
					(r) => r.toCurrency === values.currency,
				)?.rate;
				
				if (!rate) {
					toast.error(t("expenses.messages.currencyRateNotFound") || "Currency rate not found");
					return;
				}
				paymentAmountInUSD = values.amount / Number(rate);
			}
		}
		
		// Step 2: Convert USD to account currency (if not already USD)
		let finalAmount = paymentAmountInUSD;
		if (accountCurrency !== "USD") {
			const usdToAccountRate = currencyRates?.find(
				(r) => r.toCurrency === accountCurrency,
			)?.rate;
			
			if (!usdToAccountRate) {
				toast.error(t("expenses.messages.currencyRateNotFound") || "Currency rate not found");
				return;
			}
			finalAmount = paymentAmountInUSD * Number(usdToAccountRate);
		}

		if (finalAmount > currentBalance) {
			toast.error(t("loans.messages.paymentExceedsBalance"));
			return;
		}

		try {
			await expensesApi.loans.recordStandalonePayment({
				id: loanId,
				amount: values.amount, // Original input amount
				currency: values.currency, // Original input currency
				conversionRate:
					values.rateType === "custom" && values.customRate
						? values.customRate
						: undefined, // Only pass if custom rate is used
				paymentDate: values.paymentDate,
				paymentType: values.paymentType,
				notes: values.notes,
			});

			const newBalance = currentBalance - finalAmount;
			if (newBalance <= 0) {
				toast.success(t("loans.messages.paidInFull"));
			} else {
				toast.success(t("loans.messages.paymentRecorded"));
			}

			queryClient.invalidateQueries({
				queryKey: ["loan", loanId],
			});
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
				t("loans.messages.paymentError") || "Failed to record payment",
			);
			console.error(error);
		}
	};

	if (!loan) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("loans.recordPayment")}</DialogTitle>
					<DialogDescription>
						{t("loans.form.recordPaymentDescription") ||
							"Record a payment towards this loan"}
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border p-4 bg-muted/50">
					<div className="text-sm font-medium mb-2">
						{t("loans.currentBalance")}
					</div>
					<div className="text-2xl font-bold">
						{formatCurrency(
							currentBalance,
							accountCurrency,
							currencyRates?.find(
								(r) => r.toCurrency === accountCurrency,
							),
						)}
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{t("loans.form.remainingBalance", {
							amount: formatCurrency(
								currentBalance,
								accountCurrency,
								currencyRates?.find(
									(r) => r.toCurrency === accountCurrency,
								),
							),
						})}
					</div>
				</div>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
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
										{t("loans.form.paymentAmount")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											{...field}
											value={field.value || ""}
											onChange={(e) => {
												const value = e.target.value
													? Number.parseFloat(
															e.target.value,
														)
													: 0;
												field.onChange(value);
											}}
										/>
									</FormControl>
									{convertedPaymentAmount > currentBalance && (
										<p className="text-destructive text-xs">
											{t(
												"loans.messages.paymentExceedsBalance",
											)}
										</p>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Payment Date Field */}
						<FormField
							control={form.control}
							name="paymentDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("loans.form.paymentDate")}
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
											<div className="text-xs text-muted-foreground mt-1">
												{t("loans.form.willDeduct", {
													amount: formatCurrency(
														conversionData.finalAmount,
														accountCurrency,
														currencyRates?.find(
															(r) =>
																r.toCurrency ===
																accountCurrency,
														),
													),
												}) ||
													`Will deduct ${conversionData.finalAmount.toFixed(2)} ${accountCurrency} from loan balance`}
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
										<Textarea {...field} value={field.value || ""} />
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
							<Button
								type="submit"
								disabled={
									!amountValue ||
									amountValue <= 0 ||
									convertedPaymentAmount > currentBalance ||
									(selectedCurrency !== accountCurrency &&
										!conversionData)
								}
							>
								{t("loans.recordPayment")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

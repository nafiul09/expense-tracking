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
import Image from "next/image";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	websiteUrl: z.string().url().optional().or(z.literal("")),
	customIconUrl: z.string().url().optional().or(z.literal("")),
	amount: z.number().positive(),
	currency: z.string().min(1),
	renewalDate: z.coerce.date().refine(
		(date) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const dateToCheck = new Date(date);
			dateToCheck.setHours(0, 0, 0, 0);
			return dateToCheck >= today;
		},
		{
			message: "Renewal date cannot be in the past",
		},
	),
	renewalFrequency: z
		.enum(["monthly", "yearly", "weekly"])
		.default("monthly"),
	reminderDays: z.number().int().min(1).max(30).default(7),
	status: z.enum(["active", "inactive", "cancelled"]).default("active"),
	rateType: z.enum(["default", "custom"]).optional(),
	customRate: z.number().positive().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSubscriptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	subscriptionId: string;
	businessId: string;
}

export function EditSubscriptionDialog({
	open,
	onOpenChange,
	subscriptionId,
	businessId,
}: EditSubscriptionDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: subscription, isLoading } = useQuery({
		queryKey: ["subscription", subscriptionId],
		queryFn: () => expensesApi.subscriptions.getDetails(subscriptionId),
		enabled: open && !!subscriptionId,
	});

	const { data: business } = useQuery({
		queryKey: ["business", businessId],
		queryFn: () => expensesApi.businesses.getDetails(businessId),
	});

	const { data: currencyRates } = useQuery({
		queryKey: ["currencies", business?.organizationId],
		queryFn: () =>
			business
				? expensesApi.currencies.list(business.organizationId)
				: Promise.resolve([]),
		enabled: !!business,
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

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			title: "",
			description: "",
			websiteUrl: "",
			customIconUrl: "",
			amount: 0,
			currency: "USD",
			renewalDate: new Date(),
			renewalFrequency: "monthly",
			reminderDays: 7,
			status: "active",
		},
	});

	useEffect(() => {
		if (subscription) {
			form.reset({
				title: subscription.title,
				description: subscription.description || "",
				websiteUrl: subscription.websiteUrl || "",
				customIconUrl: "",
				amount: Number(subscription.amount || 0),
				currency: subscription.currency || business?.currency || "USD",
				renewalDate: new Date(subscription.renewalDate),
				renewalFrequency:
					(subscription.renewalFrequency as
						| "monthly"
						| "yearly"
						| "weekly") || "monthly",
				reminderDays: subscription.reminderDays || 7,
				status:
					(subscription.status as
						| "active"
						| "inactive"
						| "cancelled") || "active",
			});
		}
	}, [subscription, business?.currency, form]);

	const onSubmit = async (values: FormValues) => {
		try {
			const updateData: any = {
				id: subscriptionId,
				...values,
			};

			// If custom icon URL is provided, use it as websiteIcon
			if (values.customIconUrl) {
				updateData.websiteIcon = values.customIconUrl;
			}

			// Remove customIconUrl from update data as it's not a field on the subscription
			delete updateData.customIconUrl;

			await expensesApi.subscriptions.update(updateData);

			toast.success(
				t("expenses.subscriptions.updated") ||
					"Subscription updated successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["subscriptions", businessId],
			});
			queryClient.invalidateQueries({
				queryKey: ["subscription", subscriptionId],
			});
			onOpenChange(false);
		} catch (error) {
			toast.error(
				t("expenses.subscriptions.updateError") ||
					"Failed to update subscription",
			);
			console.error(error);
		}
	};

	if (isLoading) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("expenses.subscriptions.edit") ||
							"Edit Subscription"}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.subscriptions.editDescription") ||
							"Update subscription details"}
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
							name="websiteUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Website URL</FormLabel>
									<FormControl>
										<Input
											type="url"
											placeholder="https://example.com"
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Website Icon Display and Custom Upload */}
						<div className="space-y-2">
							<FormLabel>Website Icon</FormLabel>
							<div className="flex items-center gap-4">
								{subscription?.websiteIcon && (
									<div className="flex items-center gap-2">
										<Image
											src={subscription.websiteIcon}
											alt="Website icon"
											width={32}
											height={32}
											className="rounded border"
											onError={() => {
												// Hide on error - handled by Next.js Image
											}}
										/>
										<span className="text-xs text-muted-foreground">
											Auto-fetched
										</span>
									</div>
								)}
								<FormField
									control={form.control}
									name="customIconUrl"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormControl>
												<Input
													type="url"
													placeholder="Custom icon URL (optional)"
													{...field}
													value={field.value || ""}
												/>
											</FormControl>
											<p className="text-xs text-muted-foreground mt-1">
												Provide a custom icon URL if the auto-fetch failed
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Currency Conversion Details */}
						{subscription?.rateType === "custom" && subscription?.conversionRate && (
							<div className="bg-muted p-3 rounded-md space-y-1 text-sm">
								<p className="font-medium">Currency Conversion</p>
								<div className="space-y-0.5">
									<p className="text-muted-foreground">
										Rate Type: <span className="font-medium">Custom</span>
									</p>
									<p className="text-muted-foreground">
										Conversion Rate: <span className="font-medium">{Number(subscription.conversionRate).toFixed(4)}</span>
									</p>
									{subscription.baseCurrencyAmount && (
										<p className="text-muted-foreground">
											Base Amount: <span className="font-medium">{Number(subscription.baseCurrencyAmount).toFixed(2)} {business?.currency || "USD"}</span>
										</p>
									)}
								</div>
							</div>
						)}
						{subscription?.rateType === "default" && subscription?.currency !== business?.currency && (
							<div className="bg-muted p-3 rounded-md space-y-1 text-sm">
								<p className="font-medium">Currency Conversion</p>
								<div className="space-y-0.5">
									<p className="text-muted-foreground">
										Rate Type: <span className="font-medium">Default</span>
									</p>
									{subscription.conversionRate && (
										<p className="text-muted-foreground">
											Conversion Rate: <span className="font-medium">{Number(subscription.conversionRate).toFixed(4)}</span>
										</p>
									)}
									{subscription.baseCurrencyAmount && (
										<p className="text-muted-foreground">
											Base Amount: <span className="font-medium">{Number(subscription.baseCurrencyAmount).toFixed(2)} {business?.currency || "USD"}</span>
										</p>
									)}
								</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="amount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.amount",
											) || "Amount"}
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
																business?.currency &&
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

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="renewalDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.table.renewalDate",
											)}
										</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												min={
													new Date()
														.toISOString()
														.split("T")[0]
												}
												value={
													field.value
														? new Date(field.value)
																.toISOString()
																.split("T")[0]
														: ""
												}
												onChange={(e) => {
													const selectedDate = e
														.target.value
														? new Date(
																e.target.value,
															)
														: new Date();
													const today = new Date();
													today.setHours(0, 0, 0, 0);

													if (selectedDate < today) {
														toast.error(
															t(
																"expenses.subscriptions.renewalDatePastError",
															) ||
																"Renewal date cannot be in the past",
														);
														return;
													}

													field.onChange(
														selectedDate,
													);
												}}
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
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.subscriptions.table.status",
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
												<SelectItem value="active">
													{t(
														"expenses.subscriptions.status.active",
													)}
												</SelectItem>
												<SelectItem value="inactive">
													{t(
														"expenses.subscriptions.status.inactive",
													)}
												</SelectItem>
												<SelectItem value="cancelled">
													{t(
														"expenses.subscriptions.status.cancelled",
													)}
												</SelectItem>
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

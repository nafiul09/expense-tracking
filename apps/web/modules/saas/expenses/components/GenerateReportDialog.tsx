"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { config } from "@repo/config";
import { expensesApi } from "@saas/expenses/lib/api";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	reportName: z.string().min(1).optional(),
	reportType: z
		.enum([
			"all_categories",
			"subscription",
			"team_salary",
			"one_time",
			"team_member_loan",
		])
		.default("all_categories"),
	businessId: z.string().optional(),
	accountIds: z.array(z.string()).optional(),
	reportPeriodStart: z.coerce.date(),
	reportPeriodEnd: z.coerce.date(),
	reportCurrency: z.string().default("USD"),
	includeDetails: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	defaultFilters?: {
		startDate?: Date;
		endDate?: Date;
		categoryIds?: string[];
		accountIds?: string[];
	};
}

export function GenerateReportDialog({
	open,
	onOpenChange,
	organizationId,
	defaultFilters,
}: GenerateReportDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();

	const { data: expenseAccounts } = useQuery({
		queryKey: ["expenseAccounts", organizationId],
		queryFn: () => expensesApi.expenseAccounts.list(organizationId),
	});

	const { data: categories } = useQuery({
		queryKey: ["categories", organizationId],
		queryFn: () => expensesApi.categories.list(organizationId),
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			reportName: "",
			reportType: "all_categories",
			businessId: "__none__",
			accountIds: defaultFilters?.accountIds || [],
			reportPeriodStart:
				defaultFilters?.startDate ||
				new Date(new Date().getFullYear(), new Date().getMonth(), 1),
			reportPeriodEnd:
				defaultFilters?.endDate ||
				new Date(
					new Date().getFullYear(),
					new Date().getMonth() + 1,
					0,
				),
			reportCurrency: "USD",
			includeDetails: true,
		},
	});

	const onSubmit = async (values: FormValues) => {
		try {
			const report = await expensesApi.reports.generateCustom({
				organizationId,
				reportName: values.reportName,
				reportType: values.reportType,
				accountIds:
					values.accountIds && values.accountIds.length > 0
						? values.accountIds
						: values.businessId && values.businessId !== "__none__"
							? [values.businessId]
							: undefined,
				reportPeriodStart: values.reportPeriodStart,
				reportPeriodEnd: values.reportPeriodEnd,
				reportCurrency: values.reportCurrency,
				includeDetails: values.includeDetails,
			});

			toast.success(t("expenses.reports.generated"));
			queryClient.invalidateQueries({
				queryKey: ["reports", organizationId],
			});
			form.reset();
			onOpenChange(false);
			router.push(
				`/${activeOrganization?.slug}/expenses/reports/${report.id}`,
			);
		} catch (error) {
			toast.error(t("expenses.reports.generateError"));
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("expenses.reports.generate")}</DialogTitle>
					<DialogDescription>
						{t("expenses.reports.generateDescription")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="reportName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.reports.form.reportName")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"expenses.reports.form.reportNamePlaceholder",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="reportType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"expenses.reports.form.reportTypeLabel",
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
											<SelectItem value="all_categories">
												{t(
													"expenses.reports.form.reportType.allCategories",
												)}
											</SelectItem>
											<SelectItem value="subscription">
												{t(
													"expenses.reports.form.reportType.subscription",
												)}
											</SelectItem>
											<SelectItem value="team_salary">
												{t(
													"expenses.reports.form.reportType.teamSalary",
												)}
											</SelectItem>
											<SelectItem value="one_time">
												{t(
													"expenses.reports.form.reportType.oneTime",
												)}
											</SelectItem>
											<SelectItem value="team_member_loan">
												{t(
													"expenses.reports.form.reportType.teamMemberLoan",
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
							name="accountIds"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t(
											"expenses.reports.form.expenseAccounts",
										)}
									</FormLabel>
									<div className="space-y-2">
										<div className="flex flex-wrap gap-2">
											{expenseAccounts?.map((account) => {
												const isSelected =
													field.value?.includes(
														account.id,
													);
												return (
													<Button
														key={account.id}
														type="button"
														variant={
															isSelected
																? "default"
																: "outline"
														}
														size="sm"
														onClick={() => {
															const current =
																field.value ||
																[];
															const updated =
																isSelected
																	? current.filter(
																			(
																				id,
																			) =>
																				id !==
																				account.id,
																		)
																	: [
																			...current,
																			account.id,
																		];
															field.onChange(
																updated,
															);
														}}
													>
														{account.name}
													</Button>
												);
											})}
										</div>
										<p className="text-muted-foreground text-xs">
											{t(
												"expenses.reports.form.selectAllAccountsHint",
											)}
										</p>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="reportPeriodStart"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.reports.form.startDate",
											)}
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

							<FormField
								control={form.control}
								name="reportPeriodEnd"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("expenses.reports.form.endDate")}
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
								name="reportCurrency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.reports.form.currency",
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

							<FormField
								control={form.control}
								name="includeDetails"
								render={({ field }) => (
									<FormItem className="flex flex-col justify-end">
										<div className="flex items-center space-x-2">
											<input
												type="checkbox"
												checked={field.value}
												onChange={field.onChange}
												className="h-4 w-4 rounded border-gray-300"
											/>
											<FormLabel className="!mt-0">
												{t(
													"expenses.reports.form.includeDetails",
												)}
											</FormLabel>
										</div>
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
								{t("expenses.reports.generate")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

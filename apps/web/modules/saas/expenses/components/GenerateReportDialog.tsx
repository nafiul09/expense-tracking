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
	businessId: z.string().optional(),
	reportPeriodStart: z.coerce.date(),
	reportPeriodEnd: z.coerce.date(),
	reportCurrency: z.string().default("USD"),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

export function GenerateReportDialog({
	open,
	onOpenChange,
	organizationId,
}: GenerateReportDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();

	const { data: businesses } = useQuery({
		queryKey: ["businesses", organizationId],
		queryFn: () => expensesApi.businesses.list(organizationId),
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			businessId: "__none__",
			reportPeriodStart: new Date(
				new Date().getFullYear(),
				new Date().getMonth(),
				1,
			),
			reportPeriodEnd: new Date(
				new Date().getFullYear(),
				new Date().getMonth() + 1,
				0,
			),
			reportCurrency: "USD",
		},
	});

	const onSubmit = async (values: FormValues) => {
		try {
			const report = await expensesApi.reports.generate({
				organizationId,
				businessId:
					values.businessId && values.businessId !== "__none__"
						? values.businessId
						: undefined,
				reportPeriodStart: values.reportPeriodStart,
				reportPeriodEnd: values.reportPeriodEnd,
				reportCurrency: values.reportCurrency,
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
							name="businessId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.reports.form.business")}
									</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"expenses.reports.form.allExpenseAccounts",
													)}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="__none__">
												{t(
													"expenses.reports.form.allExpenseAccounts",
												)}
											</SelectItem>
											{businesses?.map((business) => (
												<SelectItem
													key={business.id}
													value={business.id}
												>
													{business.name}
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

						<FormField
							control={form.control}
							name="reportCurrency"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("expenses.reports.form.currency")}
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

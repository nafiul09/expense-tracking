"use client";

import { config } from "@repo/config";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CurrencyRatesSettingsProps {
	organizationId: string;
}

export function CurrencyRatesSettings({
	organizationId,
}: CurrencyRatesSettingsProps) {
	const t = useTranslations();
	const [editingRateId, setEditingRateId] = useState<string | null>(null);
	const [deletingRateId, setDeletingRateId] = useState<string | null>(null);
	const [addingRate, setAddingRate] = useState(false);

	const { data: rates, isLoading } = useQuery({
		queryKey: ["currencies", organizationId],
		queryFn: () => expensesApi.currencies.list(organizationId),
	});

	if (isLoading) {
		return <div>{t("common.loading")}</div>;
	}

	return (
		<Card className="p-6">
			<div className="mb-6">
				<h3 className="text-lg font-semibold">
					{t("expenses.currencies.title")}
				</h3>
				<p className="text-muted-foreground mt-1 text-sm">
					{t("expenses.currencies.description")}
				</p>
			</div>

			<div className="mb-4 flex justify-end">
				<Button onClick={() => setAddingRate(true)}>
					<PlusIcon className="mr-2 size-4" />
					{t("expenses.currencies.add")}
				</Button>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							{t("expenses.currencies.table.currency")}
						</TableHead>
						<TableHead>
							{t("expenses.currencies.table.rate")}
						</TableHead>
						<TableHead>
							{t("expenses.currencies.table.symbol")}
						</TableHead>
						<TableHead>
							{t("expenses.currencies.table.updatedAt")}
						</TableHead>
						<TableHead>
							{t("expenses.currencies.table.actions")}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rates && rates.length > 0 ? (
						rates.map((rate) => (
							<TableRow key={rate.id}>
								<TableCell className="font-medium">
									{rate.toCurrency}
								</TableCell>
								<TableCell>
									1 {config.expenses.defaultBaseCurrency} ={" "}
									{Number(rate.rate).toFixed(4)}{" "}
									{rate.toCurrency}
								</TableCell>
								<TableCell>{rate.symbol || "-"}</TableCell>
								<TableCell>
									{new Date(
										rate.updatedAt,
									).toLocaleDateString()}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												setEditingRateId(rate.id)
											}
										>
											<PencilIcon className="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												setDeletingRateId(rate.id)
											}
										>
											<TrashIcon className="size-4 text-destructive" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={5}
								className="text-center text-muted-foreground"
							>
								{t("expenses.currencies.empty")}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			{addingRate && (
				<CurrencyRateDialog
					open={addingRate}
					onOpenChange={setAddingRate}
					organizationId={organizationId}
					existingRates={(rates || []).map((r) => ({
						toCurrency: r.toCurrency,
						id: r.id,
					}))}
				/>
			)}

			{editingRateId && rates && (
				<CurrencyRateDialog
					open={!!editingRateId}
					onOpenChange={(open) => !open && setEditingRateId(null)}
					organizationId={organizationId}
					existingRates={rates.map((r) => ({
						toCurrency: r.toCurrency,
						id: r.id,
					}))}
					rate={(() => {
						const found = rates.find((r) => r.id === editingRateId);
						return found
							? {
									id: found.id,
									toCurrency: found.toCurrency,
									rate: Number(found.rate),
									symbol: found.symbol,
									symbolPosition: found.symbolPosition,
									separator: found.separator,
									decimalSeparator: found.decimalSeparator,
								}
							: undefined;
					})()}
				/>
			)}

			{deletingRateId && rates && (
				<DeleteCurrencyRateDialog
					open={!!deletingRateId}
					onOpenChange={(open) => !open && setDeletingRateId(null)}
					rateId={deletingRateId}
					organizationId={organizationId}
					currency={
						rates.find((r) => r.id === deletingRateId)
							?.toCurrency || ""
					}
				/>
			)}
		</Card>
	);
}

interface CurrencyRateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
	existingRates: Array<{ toCurrency: string; id: string }>;
	rate?: {
		id: string;
		toCurrency: string;
		rate: number;
		symbol?: string | null;
		symbolPosition?: string | null;
		separator?: string | null;
		decimalSeparator?: string | null;
	};
}

function CurrencyRateDialog({
	open,
	onOpenChange,
	organizationId,
	existingRates,
	rate,
}: CurrencyRateDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [currency, setCurrency] = useState(rate?.toCurrency || "");
	const [rateValue, setRateValue] = useState(
		rate?.rate ? String(rate.rate) : "",
	);
	const [symbol, setSymbol] = useState(rate?.symbol || "");
	const [symbolPosition, setSymbolPosition] = useState<"left" | "right">(
		(rate?.symbolPosition as "left" | "right") || "left",
	);
	const [separator, setSeparator] = useState(rate?.separator || ",");
	const [decimalSeparator, setDecimalSeparator] = useState(
		rate?.decimalSeparator || ".",
	);

	const supportedCurrencies = config.expenses.supportedCurrencies.filter(
		(c) =>
			c !== config.expenses.defaultBaseCurrency &&
			!existingRates.some((r) => r.toCurrency === c && r.id !== rate?.id),
	);

	useEffect(() => {
		if (open && rate) {
			setCurrency(rate.toCurrency);
			setRateValue(String(rate.rate));
			setSymbol(rate.symbol || "");
			setSymbolPosition(
				(rate.symbolPosition as "left" | "right") || "left",
			);
			setSeparator(rate.separator || ",");
			setDecimalSeparator(rate.decimalSeparator || ".");
		} else if (open && !rate) {
			setCurrency("");
			setRateValue("");
			setSymbol("");
			setSymbolPosition("left");
			setSeparator(",");
			setDecimalSeparator(".");
		}
	}, [open, rate]);

	const handleSubmit = async () => {
		if (!currency || !rateValue) {
			toast.error(t("expenses.currencies.validation.required"));
			return;
		}

		const numRate = Number.parseFloat(rateValue);
		if (Number.isNaN(numRate) || numRate <= 0) {
			toast.error(t("expenses.currencies.validation.invalidRate"));
			return;
		}

		if (separator.length !== 1 || decimalSeparator.length !== 1) {
			toast.error(t("expenses.currencies.validation.invalidSeparator"));
			return;
		}

		if (separator === decimalSeparator) {
			toast.error(
				t("expenses.currencies.validation.separatorsMustDiffer"),
			);
			return;
		}

		try {
			await expensesApi.currencies.upsert({
				organizationId,
				toCurrency: currency,
				rate: numRate,
				symbol: symbol || undefined,
				symbolPosition,
				separator,
				decimalSeparator,
			});

			toast.success(
				rate
					? t("expenses.currencies.updated")
					: t("expenses.currencies.created"),
			);
			queryClient.invalidateQueries({
				queryKey: ["currencies", organizationId],
			});
			queryClient.invalidateQueries({
				queryKey: ["currencyRates", organizationId],
			});
			onOpenChange(false);
			setCurrency("");
			setRateValue("");
			setSymbol("");
			setSymbolPosition("left");
			setSeparator(",");
			setDecimalSeparator(".");
		} catch (error) {
			toast.error(
				rate
					? t("expenses.currencies.updateError")
					: t("expenses.currencies.createError"),
			);
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{rate
							? t("expenses.currencies.edit")
							: t("expenses.currencies.add")}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.currencies.dialogDescription", {
							baseCurrency: config.expenses.defaultBaseCurrency,
						})}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>{t("expenses.currencies.form.currency")}</Label>
						<Select
							value={currency}
							onValueChange={setCurrency}
							disabled={!!rate}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t(
										"expenses.currencies.form.selectCurrency",
									)}
								/>
							</SelectTrigger>
							<SelectContent>
								{supportedCurrencies.map((curr) => (
									<SelectItem key={curr} value={curr}>
										{curr}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>{t("expenses.currencies.form.rate")}</Label>
						<Input
							type="number"
							step="0.0001"
							value={rateValue}
							onChange={(e) => setRateValue(e.target.value)}
							placeholder="1.0000"
						/>
						<p className="text-muted-foreground text-xs">
							{t("expenses.currencies.form.rateHint", {
								baseCurrency:
									config.expenses.defaultBaseCurrency,
							})}
						</p>
					</div>

					<div className="space-y-2">
						<Label>{t("expenses.currencies.form.symbol")}</Label>
						<Input
							type="text"
							value={symbol}
							onChange={(e) => setSymbol(e.target.value)}
							placeholder="$"
							maxLength={5}
						/>
						<p className="text-muted-foreground text-xs">
							{t("expenses.currencies.form.symbolHint")}
						</p>
					</div>

					<div className="space-y-2">
						<Label>
							{t("expenses.currencies.form.symbolPosition")}
						</Label>
						<Select
							value={symbolPosition}
							onValueChange={(value: "left" | "right") =>
								setSymbolPosition(value)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="left">
									{t("expenses.currencies.form.symbolLeft")}
								</SelectItem>
								<SelectItem value="right">
									{t("expenses.currencies.form.symbolRight")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>
								{t("expenses.currencies.form.separator")}
							</Label>
							<Input
								type="text"
								value={separator}
								onChange={(e) => setSeparator(e.target.value)}
								placeholder=","
								maxLength={1}
							/>
							<p className="text-muted-foreground text-xs">
								{t("expenses.currencies.form.separatorHint")}
							</p>
						</div>

						<div className="space-y-2">
							<Label>
								{t("expenses.currencies.form.decimalSeparator")}
							</Label>
							<Input
								type="text"
								value={decimalSeparator}
								onChange={(e) =>
									setDecimalSeparator(e.target.value)
								}
								placeholder="."
								maxLength={1}
							/>
							<p className="text-muted-foreground text-xs">
								{t(
									"expenses.currencies.form.decimalSeparatorHint",
								)}
							</p>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit}>
						{rate ? t("common.save") : t("common.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface DeleteCurrencyRateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rateId: string;
	organizationId: string;
	currency: string;
}

function DeleteCurrencyRateDialog({
	open,
	onOpenChange,
	rateId,
	organizationId,
	currency,
}: DeleteCurrencyRateDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const handleDelete = async () => {
		try {
			await expensesApi.currencies.delete(rateId);
			toast.success(t("expenses.currencies.deleted"));
			queryClient.invalidateQueries({
				queryKey: ["currencies", organizationId],
			});
			queryClient.invalidateQueries({
				queryKey: ["currencyRates", organizationId],
			});
			onOpenChange(false);
		} catch (error: any) {
			// Check if it's a validation error with specific message
			const errorMessage =
				error?.message ||
				error?.data?.message ||
				t("expenses.currencies.deleteError");

			// Try to extract currency and count from error message for better UX
			if (errorMessage.includes("expense account")) {
				const match = errorMessage.match(/(\d+) expense account\(s\)/);
				if (match) {
					const count = match[1];
					toast.error(
						t(
							"expenses.currencies.deleteError.expenseAccountsInUse",
							{
								currency,
								count,
							},
						),
					);
				} else {
					toast.error(errorMessage);
				}
			} else if (errorMessage.includes("expense(s)")) {
				const match = errorMessage.match(/(\d+) expense\(s\)/);
				if (match) {
					const count = match[1];
					toast.error(
						t("expenses.currencies.deleteError.expensesInUse", {
							currency,
							count,
						}),
					);
				} else {
					toast.error(errorMessage);
				}
			} else {
				toast.error(errorMessage);
			}
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("expenses.currencies.delete")}</DialogTitle>
					<DialogDescription>
						{t("expenses.currencies.deleteDescription", {
							currency,
						})}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button variant="destructive" onClick={handleDelete}>
						{t("common.delete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

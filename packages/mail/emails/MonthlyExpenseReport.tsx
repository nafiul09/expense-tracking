import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

export function MonthlyExpenseReport({
	url,
	businessName,
	reportPeriodStart,
	reportPeriodEnd,
	totalExpenses,
	currency,
	locale,
	translations,
}: {
	url: string;
	businessName?: string;
	reportPeriodStart: string;
	reportPeriodEnd: string;
	totalExpenses: number;
	currency: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: translations,
	});

	return (
		<Wrapper>
			<Heading className="text-xl">
				{t.markup("mail.monthlyExpenseReport.headline", {
					strong: (chunks) => `<strong>${chunks}</strong>`,
				})}
			</Heading>
			<Text>
				{t("mail.monthlyExpenseReport.body", {
					businessName:
						businessName ||
						t("mail.monthlyExpenseReport.allBusinesses"),
					reportPeriodStart,
					reportPeriodEnd,
					totalExpenses: `${currency} ${totalExpenses.toFixed(2)}`,
				})}
			</Text>

			<PrimaryButton href={url}>
				{t("mail.monthlyExpenseReport.viewReport")}
			</PrimaryButton>

			<Text className="mt-4 text-muted-foreground text-sm">
				{t("mail.common.openLinkInBrowser")}
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

MonthlyExpenseReport.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	url: "#",
	businessName: "Personal",
	reportPeriodStart: "January 1, 2026",
	reportPeriodEnd: "January 31, 2026",
	totalExpenses: 1250.5,
	currency: "USD",
};

export default MonthlyExpenseReport;

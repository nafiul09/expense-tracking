import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

export function LoanPaymentReceived({
	url,
	teamMemberName,
	paymentAmount,
	remainingAmount,
	currency,
	businessName,
	locale,
	translations,
}: {
	url: string;
	teamMemberName: string;
	paymentAmount: number;
	remainingAmount: number;
	currency: string;
	businessName: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: translations,
	});

	return (
		<Wrapper>
			<Heading className="text-xl">
				{t.markup("mail.loanPaymentReceived.headline", {
					strong: (chunks) => `<strong>${chunks}</strong>`,
				})}
			</Heading>
			<Text>
				{t("mail.loanPaymentReceived.body", {
					teamMemberName,
					paymentAmount: `${currency} ${paymentAmount.toFixed(2)}`,
					remainingAmount: `${currency} ${remainingAmount.toFixed(2)}`,
					businessName,
				})}
			</Text>

			<PrimaryButton href={url}>
				{t("mail.loanPaymentReceived.viewLoan")}
			</PrimaryButton>

			<Text className="mt-4 text-muted-foreground text-sm">
				{t("mail.common.openLinkInBrowser")}
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

LoanPaymentReceived.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	url: "#",
	teamMemberName: "John Doe",
	paymentAmount: 500,
	remainingAmount: 1500,
	currency: "USD",
	businessName: "Company XYZ",
};

export default LoanPaymentReceived;

import { Heading, Link, Text } from "@react-email/components";
import React from "react";
import { createTranslator } from "use-intl/core";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

export function SubscriptionRenewalReminder({
	url,
	subscriptionName,
	renewalDate,
	businessName,
	amount,
	currency,
	locale,
	translations,
}: {
	url: string;
	subscriptionName: string;
	renewalDate: string;
	businessName: string;
	amount: number;
	currency: string;
} & BaseMailProps) {
	const t = createTranslator({
		locale,
		messages: translations,
	});

	return (
		<Wrapper>
			<Heading className="text-xl">
				{t.markup("mail.subscriptionRenewalReminder.headline", {
					subscriptionName,
					strong: (chunks) => `<strong>${chunks}</strong>`,
				})}
			</Heading>
			<Text>
				{t("mail.subscriptionRenewalReminder.body", {
					subscriptionName,
					businessName,
					renewalDate,
					amount: `${currency} ${amount.toFixed(2)}`,
				})}
			</Text>

			<PrimaryButton href={url}>
				{t("mail.subscriptionRenewalReminder.viewSubscription")}
			</PrimaryButton>

			<Text className="mt-4 text-muted-foreground text-sm">
				{t("mail.common.openLinkInBrowser")}
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

SubscriptionRenewalReminder.PreviewProps = {
	locale: defaultLocale,
	translations: defaultTranslations,
	url: "#",
	subscriptionName: "Netflix",
	renewalDate: "January 25, 2026",
	businessName: "Personal",
	amount: 15.99,
	currency: "USD",
};

export default SubscriptionRenewalReminder;

import { EmailVerification } from "../emails/EmailVerification";
import { ForgotPassword } from "../emails/ForgotPassword";
import { LoanPaymentReceived } from "../emails/LoanPaymentReceived";
import { MagicLink } from "../emails/MagicLink";
import { MonthlyExpenseReport } from "../emails/MonthlyExpenseReport";
import { NewUser } from "../emails/NewUser";
import { OrganizationInvitation } from "../emails/OrganizationInvitation";
import { SubscriptionCancellationReminder } from "../emails/SubscriptionCancellationReminder";
import { SubscriptionRenewalReminder } from "../emails/SubscriptionRenewalReminder";

export const mailTemplates = {
	magicLink: MagicLink,
	forgotPassword: ForgotPassword,
	newUser: NewUser,
	organizationInvitation: OrganizationInvitation,
	emailVerification: EmailVerification,
	subscriptionRenewalReminder: SubscriptionRenewalReminder,
	subscriptionCancellationReminder: SubscriptionCancellationReminder,
	monthlyExpenseReport: MonthlyExpenseReport,
	loanPaymentReceived: LoanPaymentReceived,
} as const;

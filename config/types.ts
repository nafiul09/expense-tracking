export type Config = {
	appName: string;
	i18n: {
		enabled: boolean;
		locales: { [locale: string]: { currency: string; label: string } };
		defaultLocale: string;
		defaultCurrency: string;
		localeCookieName: string;
	};
	organizations: {
		enable: boolean;
		enableBilling: boolean;
		enableUsersToCreateOrganizations: boolean;
		requireOrganization: boolean;
		hideOrganization: boolean;
		forbiddenOrganizationSlugs: string[];
	};
	users: {
		enableBilling: boolean;
		enableOnboarding: boolean;
	};
	auth: {
		enableSignup: boolean;
		enableMagicLink: boolean;
		enableSocialLogin: boolean;
		enablePasskeys: boolean;
		enablePasswordLogin: boolean;
		enableTwoFactor: boolean;
		redirectAfterSignIn: string;
		redirectAfterLogout: string;
		sessionCookieMaxAge: number;
	};
	mails: {
		from: string;
	};
	storage: {
		bucketNames: {
			avatars: string;
			receipts: string;
		};
	};
	expenses: {
		defaultCategories: string[];
		defaultReminderDays: number;
		reportGeneration: {
			defaultBillingPeriodStart: number; // Day of month (1-31)
			defaultBillingPeriodEnd: number; // Day of month (1-31)
		};
		supportedCurrencies: string[];
		defaultBaseCurrency: string;
	};
	ui: {
		enabledThemes: Array<"light" | "dark">;
		defaultTheme: Config["ui"]["enabledThemes"][number] | "system";
		saas: {
			enabled: boolean;
			useSidebarLayout: boolean;
		};
		marketing: {
			enabled: boolean;
		};
	};
	payments: {
		plans: {
			[id: string]: {
				hidden?: boolean;
				isFree?: boolean;
				isEnterprise?: boolean;
				recommended?: boolean;
				limits?: {
					projects?: number | null;
					customDomain?: boolean; // true = enabled, false = disabled
					// Add more as features expand
				};
				prices?: Array<
					{
						productId: string;
						amount: number;
						currency: string;
						hidden?: boolean;
					} & (
						| {
								type: "recurring";
								interval: "month" | "year" | "week";
								intervalCount?: number;
								trialPeriodDays?: number;
								seatBased?: boolean;
						  }
						| {
								type: "one-time";
						  }
					)
				>;
			};
		};
	};
};

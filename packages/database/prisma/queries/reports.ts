import { db } from "../client";

export async function getExpenseReportById(id: string) {
	return db.expenseReport.findUnique({
		where: { id },
		include: {
			organization: true,
			expenseAccount: true,
		},
	});
}

export async function getExpenseReportsByOrganizationId(
	organizationId: string,
	options?: {
		businessId?: string;
		reportType?: string;
		isScheduled?: boolean;
	},
) {
	const where: any = {
		organizationId,
	};

	if (options?.businessId) {
		where.businessId = options.businessId;
	}

	if (options?.reportType) {
		where.reportType = options.reportType;
	}

	if (options?.isScheduled !== undefined) {
		where.isScheduled = options.isScheduled;
	}

	return db.expenseReport.findMany({
		where,
		include: {
			expenseAccount: true,
		},
		orderBy: {
			generatedAt: "desc",
		},
	});
}

export async function createExpenseReport(data: {
	organizationId: string;
	businessId?: string;
	reportName?: string;
	reportType?: string;
	reportPeriodStart: Date;
	reportPeriodEnd: Date;
	selectedAccountIds?: string | string[];
	totalExpenses: number;
	reportCurrency?: string;
	categoryBreakdown?: any;
	reportData: any;
	isScheduled?: boolean;
	emailSentAt?: Date;
}) {
	return db.expenseReport.create({
		data: {
			organizationId: data.organizationId,
			businessId: data.businessId,
			reportName: data.reportName,
			reportType: data.reportType || "all_categories",
			reportPeriodStart: data.reportPeriodStart,
			reportPeriodEnd: data.reportPeriodEnd,
			selectedAccountIds: Array.isArray(data.selectedAccountIds)
				? data.selectedAccountIds
				: data.selectedAccountIds
					? JSON.parse(data.selectedAccountIds)
					: undefined,
			totalExpenses: data.totalExpenses,
			reportCurrency: data.reportCurrency || "USD",
			categoryBreakdown: data.categoryBreakdown,
			reportData: data.reportData,
			isScheduled: data.isScheduled || false,
			emailSentAt: data.emailSentAt,
		},
	});
}

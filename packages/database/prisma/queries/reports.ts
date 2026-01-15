import { db } from "../client";

export async function getExpenseReportById(id: string) {
	return db.expenseReport.findUnique({
		where: { id },
		include: {
			organization: true,
			business: true,
		},
	});
}

export async function getExpenseReportsByOrganizationId(
	organizationId: string,
	businessId?: string,
) {
	const where: any = {
		organizationId,
	};

	if (businessId) {
		where.businessId = businessId;
	}

	return db.expenseReport.findMany({
		where,
		include: {
			business: true,
		},
		orderBy: {
			generatedAt: "desc",
		},
	});
}

export async function createExpenseReport(data: {
	organizationId: string;
	businessId?: string;
	reportPeriodStart: Date;
	reportPeriodEnd: Date;
	totalExpenses: number;
	reportCurrency?: string;
	categoryBreakdown?: any;
	reportData: any;
	emailSentAt?: Date;
}) {
	return db.expenseReport.create({
		data: {
			...data,
			reportCurrency: data.reportCurrency || "USD",
		},
	});
}

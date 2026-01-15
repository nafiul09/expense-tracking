import {
	createExpenseReport,
	db,
	getBusinessesByOrganizationId,
	getCategoryBreakdown,
	getExpensesTotalByBusinessId,
} from "@repo/database";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	// Verify cron secret
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const today = new Date();
		const dayOfMonth = today.getDate();

		// Get all organizations
		const organizations = await db.organization.findMany({
			include: {
				members: {
					include: {
						user: true,
					},
				},
			},
		});

		const baseUrl = getBaseUrl();
		let reportsGenerated = 0;

		for (const organization of organizations) {
			// Check if this organization's billing period ends today
			// For now, we'll generate reports for all organizations on the 1st of each month
			// In the future, this can be customized per organization
			if (dayOfMonth !== 1) {
				continue;
			}

			const businesses = await getBusinessesByOrganizationId(
				organization.id,
			);

			if (businesses.length === 0) {
				continue;
			}

			// Calculate report period (previous month)
			const reportPeriodEnd = new Date(
				today.getFullYear(),
				today.getMonth(),
				0,
			);
			const reportPeriodStart = new Date(
				today.getFullYear(),
				today.getMonth() - 1,
				1,
			);

			let totalExpenses = 0;
			const reportData: any = {
				businesses: [],
				totalExpenses: 0,
			};

			for (const business of businesses) {
				const businessTotal = await getExpensesTotalByBusinessId(
					business.id,
					reportPeriodStart,
					reportPeriodEnd,
				);

				const categoryBreakdown = await getCategoryBreakdown(
					business.id,
					reportPeriodStart,
					reportPeriodEnd,
				);

				reportData.businesses.push({
					businessId: business.id,
					businessName: business.name,
					totalExpenses: Number(businessTotal),
					categoryBreakdown,
				});

				totalExpenses += Number(businessTotal);
			}

			reportData.totalExpenses = totalExpenses;

			// Generate report
			const report = await createExpenseReport({
				organizationId: organization.id,
				reportPeriodStart,
				reportPeriodEnd,
				totalExpenses,
				categoryBreakdown:
					reportData.businesses[0]?.categoryBreakdown || {},
				reportData,
			});

			// Send email to all organization members
			const reportUrl = `${baseUrl}/${organization.slug}/expenses/reports/${report.id}`;

			for (const member of organization.members) {
				const user = member.user;
				if (!user.email) continue;

				await sendEmail({
					to: user.email,
					templateId: "monthlyExpenseReport",
					context: {
						url: reportUrl,
						businessName: undefined, // All businesses
						reportPeriodStart:
							reportPeriodStart.toLocaleDateString(),
						reportPeriodEnd: reportPeriodEnd.toLocaleDateString(),
						totalExpenses,
						currency: businesses[0]?.currency || "USD",
					},
				});
			}

			// Update report email sent timestamp
			await db.expenseReport.update({
				where: { id: report.id },
				data: { emailSentAt: new Date() },
			});

			reportsGenerated++;
		}

		return NextResponse.json({
			success: true,
			reportsGenerated,
		});
	} catch (error) {
		console.error("Error generating monthly reports:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

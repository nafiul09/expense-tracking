import { db } from "../client";

export interface CreateStandaloneLoanInput {
	teamMemberId: string;
	businessId: string;
	principalAmount: number;
	currentBalance: number;
	currency: string;
	conversionRate?: number;
	rateType?: string;
	baseCurrencyAmount?: number;
	loanDate: Date;
	notes?: string;
	status?: string;
	createdBy: string;
}

export interface RecordLoanPaymentInput {
	loanId: string;
	amount: number;
	currency: string;
	conversionRate?: number;
	paymentDate: Date;
	paymentType?: string;
	notes?: string;
	recordedBy: string;
}

export async function getStandaloneLoanById(id: string) {
	return db.loan.findUnique({
		where: { id },
		include: {
			teamMember: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
					organizationId: true,
				},
			},
			payments: {
				orderBy: {
					paymentDate: "desc",
				},
			},
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});
}

export async function getStandaloneLoansByBusinessId(
	businessId: string,
	options?: {
		status?: string;
		teamMemberId?: string;
		loanDateStart?: Date;
		loanDateEnd?: Date;
	},
) {
	const where: any = {
		businessId,
	};

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.teamMemberId) {
		where.teamMemberId = options.teamMemberId;
	}

	if (options?.loanDateStart || options?.loanDateEnd) {
		where.loanDate = {};
		if (options.loanDateStart) {
			where.loanDate.gte = options.loanDateStart;
		}
		if (options.loanDateEnd) {
			where.loanDate.lte = options.loanDateEnd;
		}
	}

	return db.loan.findMany({
		where,
		include: {
			teamMember: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			_count: {
				select: {
					payments: true,
				},
			},
		},
		orderBy: {
			loanDate: "desc",
		},
	});
}

export async function getAllStandaloneLoansByOrganizationId(
	organizationId: string,
	options?: {
		accountIds?: string[];
		teamMemberIds?: string[];
		status?: string;
		loanDateStart?: Date;
		loanDateEnd?: Date;
	},
) {
	const where: any = {
		expenseAccount: {
			organizationId,
		},
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.businessId = { in: options.accountIds };
	}

	if (options?.teamMemberIds && options.teamMemberIds.length > 0) {
		where.teamMemberId = { in: options.teamMemberIds };
	}

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.loanDateStart || options?.loanDateEnd) {
		where.loanDate = {};
		if (options.loanDateStart) {
			where.loanDate.gte = options.loanDateStart;
		}
		if (options.loanDateEnd) {
			where.loanDate.lte = options.loanDateEnd;
		}
	}

	return db.loan.findMany({
		where,
		include: {
			teamMember: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			_count: {
				select: {
					payments: true,
				},
			},
		},
		orderBy: {
			loanDate: "desc",
		},
	});
}

export async function createStandaloneLoan(data: CreateStandaloneLoanInput) {
	const loan = await db.loan.create({
		data: {
			teamMemberId: data.teamMemberId,
			businessId: data.businessId,
			principalAmount: data.principalAmount,
			currentBalance: data.currentBalance,
			currency: data.currency,
			conversionRate: data.conversionRate,
			rateType: data.rateType,
			baseCurrencyAmount: data.baseCurrencyAmount,
			loanDate: data.loanDate,
			notes: data.notes,
			status: data.status || "active",
			createdBy: data.createdBy,
		},
	});

	// Update team member's total loan balance
	await updateTeamMemberLoanBalance(data.teamMemberId);

	return loan;
}

export async function updateStandaloneLoan(
	id: string,
	data: Partial<CreateStandaloneLoanInput>,
) {
	const loan = await db.loan.update({
		where: { id },
		data: {
			...(data.principalAmount !== undefined && {
				principalAmount: data.principalAmount,
			}),
			...(data.currentBalance !== undefined && {
				currentBalance: data.currentBalance,
			}),
			...(data.currency !== undefined && { currency: data.currency }),
			...(data.conversionRate !== undefined && {
				conversionRate: data.conversionRate,
			}),
			...(data.rateType !== undefined && { rateType: data.rateType }),
			...(data.baseCurrencyAmount !== undefined && {
				baseCurrencyAmount: data.baseCurrencyAmount,
			}),
			...(data.notes !== undefined && { notes: data.notes }),
			...(data.status !== undefined && { status: data.status }),
		},
	});

	// Update team member's total loan balance
	if (loan.teamMemberId) {
		await updateTeamMemberLoanBalance(loan.teamMemberId);
	}

	return loan;
}

export async function recordStandaloneLoanPayment(
	data: RecordLoanPaymentInput,
) {
	const loan = await db.loan.findUnique({
		where: { id: data.loanId },
	});

	if (!loan) {
		throw new Error("Loan not found");
	}

	const currentBalance = Number(loan.currentBalance);
	const paymentAmount = data.amount;

	if (paymentAmount > currentBalance) {
		throw new Error("Payment amount exceeds current loan balance");
	}

	const newBalance = currentBalance - paymentAmount;
	const status = newBalance <= 0 ? "paid" : loan.status;

	// Update loan balance and status
	await db.loan.update({
		where: { id: data.loanId },
		data: {
			currentBalance: newBalance,
			status,
		},
	});

	// Create payment record
	const payment = await db.standaloneLoanPayment.create({
		data: {
			loanId: data.loanId,
			amount: data.amount,
			currency: data.currency,
			conversionRate: data.conversionRate,
			paymentDate: data.paymentDate,
			paymentType: data.paymentType || "payment",
			notes: data.notes,
			recordedBy: data.recordedBy,
		},
	});

	// Update team member's total loan balance
	await updateTeamMemberLoanBalance(loan.teamMemberId);

	return payment;
}

export async function getStandaloneLoanPayments(loanId: string) {
	return db.standaloneLoanPayment.findMany({
		where: { loanId },
		include: {
			recorder: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
		orderBy: {
			paymentDate: "desc",
		},
	});
}

export async function cancelStandaloneLoan(id: string) {
	const loan = await db.loan.findUnique({
		where: { id },
	});

	if (!loan) {
		throw new Error("Loan not found");
	}

	const updatedLoan = await db.loan.update({
		where: { id },
		data: {
			status: "cancelled",
		},
	});

	// Update team member's total loan balance
	await updateTeamMemberLoanBalance(loan.teamMemberId);

	return updatedLoan;
}

async function updateTeamMemberLoanBalance(teamMemberId: string) {
	const totalBalance = await db.loan.aggregate({
		where: {
			teamMemberId,
			status: "active",
		},
		_sum: {
			currentBalance: true,
		},
	});

	await db.teamMember.update({
		where: { id: teamMemberId },
		data: {
			totalLoanBalance: totalBalance._sum.currentBalance || 0,
		},
	});
}

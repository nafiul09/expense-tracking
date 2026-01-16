import { db } from "../client";
import type { LoanUpdateInput } from "../generated/models/Loan";

export async function getLoanById(id: string) {
	return db.loan.findUnique({
		where: { id },
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
					organizationId: true,
				},
			},
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			payments: {
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
			},
		},
	});
}

export async function getLoansByExpenseAccountId(
	expenseAccountId: string,
	options?: {
		loanType?: string;
		status?: string;
		partyName?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	},
) {
	const where: any = {
		expenseAccountId,
	};

	if (options?.loanType) {
		where.loanType = options.loanType;
	}

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.partyName) {
		where.partyName = {
			contains: options.partyName,
			mode: "insensitive",
		};
	}

	if (options?.startDate || options?.endDate) {
		where.loanDate = {};
		if (options.startDate) {
			where.loanDate.gte = options.startDate;
		}
		if (options.endDate) {
			where.loanDate.lte = options.endDate;
		}
	}

	return db.loan.findMany({
		where,
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
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
		take: options?.limit,
		skip: options?.offset,
	});
}

export async function getAllLoansByOrganizationId(
	organizationId: string,
	options?: {
		accountIds?: string[];
		loanType?: string;
		status?: string;
		partyName?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	},
) {
	const where: any = {
		expenseAccount: {
			organizationId,
		},
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.expenseAccountId = { in: options.accountIds };
	}

	if (options?.loanType) {
		where.loanType = options.loanType;
	}

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.partyName) {
		where.partyName = {
			contains: options.partyName,
			mode: "insensitive",
		};
	}

	if (options?.startDate || options?.endDate) {
		where.loanDate = {};
		if (options.startDate) {
			where.loanDate.gte = options.startDate;
		}
		if (options.endDate) {
			where.loanDate.lte = options.endDate;
		}
	}

	return db.loan.findMany({
		where,
		include: {
			expenseAccount: {
				select: {
					id: true,
					name: true,
					currency: true,
				},
			},
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
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
		take: options?.limit,
		skip: options?.offset,
	});
}

export async function createLoan(data: {
	expenseAccountId: string;
	loanType: string; // "given" or "taken"
	partyName: string;
	partyContact?: string;
	principalAmount: number;
	currentBalance: number;
	currency?: string;
	conversionRate?: number;
	rateType?: string;
	baseCurrencyAmount?: number;
	interestRate?: number;
	interestType?: string;
	loanDate: Date;
	dueDate?: Date;
	collateral?: string;
	notes?: string;
	status?: string;
	createdBy: string;
}) {
	return db.loan.create({
		data,
	});
}

export async function updateLoan(data: LoanUpdateInput & { id: string }) {
	const { id, ...updateData } = data;
	return db.loan.update({
		where: { id },
		data: updateData as LoanUpdateInput,
	});
}

export async function deleteLoan(id: string) {
	// Hard delete - permanently remove the loan record
	return db.loan.delete({
		where: { id },
	});
}

export async function addLoanPayment(data: {
	loanId: string;
	amount: number;
	currency?: string;
	conversionRate?: number;
	paymentDate: Date;
	paymentType?: string; // "principal", "interest", "both"
	notes?: string;
	recordedBy: string;
}) {
	// Update loan current balance
	const loan = await db.loan.findUnique({
		where: { id: data.loanId },
	});

	if (!loan) {
		throw new Error("Loan not found");
	}

	// Calculate new balance based on payment type
	let newBalance = Number(loan.currentBalance);
	let newAccruedInterest = Number(loan.accruedInterest || 0);

	if (data.paymentType === "principal" || data.paymentType === "both") {
		newBalance = newBalance - data.amount;
	}
	if (data.paymentType === "interest" || data.paymentType === "both") {
		if (data.paymentType === "both") {
			// Split payment between principal and interest
			// For now, apply full amount to principal, then interest
			newBalance = newBalance - data.amount;
		} else {
			newAccruedInterest = Math.max(0, newAccruedInterest - data.amount);
		}
	}

	// Update status based on balance
	let status = loan.status;
	if (newBalance <= 0 && newAccruedInterest <= 0) {
		status = "paid";
	} else if (newBalance < Number(loan.currentBalance)) {
		status = "active"; // Keep active if partially paid
	}

	await db.loan.update({
		where: { id: data.loanId },
		data: {
			currentBalance: newBalance,
			accruedInterest: newAccruedInterest,
			status,
		},
	});

	return db.loanPayment.create({
		data: {
			loanId: data.loanId,
			amount: data.amount,
			currency: data.currency || loan.currency,
			conversionRate: data.conversionRate,
			paymentDate: data.paymentDate,
			paymentType: data.paymentType || "principal",
			notes: data.notes,
			recordedBy: data.recordedBy,
		},
	});
}

export async function getLoanPayments(loanId: string) {
	return db.loanPayment.findMany({
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

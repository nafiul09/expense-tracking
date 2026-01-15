import type { TeamMemberLoanUpdateInput } from "../generated/models/TeamMemberLoan";
import type { LoanPaymentCreateInput } from "../generated/models/LoanPayment";
import { db } from "../client";

export async function getLoanById(id: string) {
	return db.teamMemberLoan.findUnique({
		where: { id },
		include: {
			expense: {
				include: {
					expenseAccount: true,
					category: true,
				},
			},
			teamMember: true,
			payments: {
				orderBy: {
					paymentDate: "desc",
				},
			},
		},
	});
}

export async function getLoanByExpenseId(expenseId: string) {
	return db.teamMemberLoan.findUnique({
		where: { expenseId },
		include: {
			teamMember: true,
			payments: {
				orderBy: {
					paymentDate: "desc",
				},
			},
		},
	});
}

export async function getLoansByBusinessId(
	businessId: string,
	status?: string,
	teamMemberId?: string,
) {
	const where: any = {
		expense: {
			businessId,
		},
	};

	if (status) {
		where.status = status;
	}

	if (teamMemberId) {
		where.teamMemberId = teamMemberId;
	}

	return db.teamMemberLoan.findMany({
		where,
		include: {
			expense: {
				include: {
					expenseAccount: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
					category: true,
				},
			},
			teamMember: {
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
	});
}

export async function getAllLoansByOrganizationId(
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
		expense: {
			expenseAccount: {
				organizationId,
			},
		},
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.expense.businessId = { in: options.accountIds };
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

	return db.teamMemberLoan.findMany({
		where,
		include: {
			expense: {
				include: {
					expenseAccount: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
					category: true,
				},
			},
			teamMember: {
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
	});
}

export async function createLoan(data: {
	expenseId: string;
	teamMemberId: string;
	principalAmount: number;
	remainingAmount: number;
	loanDate: Date;
	notes?: string;
	status?: string;
}) {
	return db.teamMemberLoan.create({
		data,
	});
}

export async function updateLoan(
	data: TeamMemberLoanUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;
	return db.teamMemberLoan.update({
		where: { id },
		data: updateData as TeamMemberLoanUpdateInput,
	});
}

export async function addLoanPayment(data: {
	loanId: string;
	amount: number;
	paymentDate: Date;
	paymentMethod?: string;
	notes?: string;
	recordedBy: string;
}) {
	// Update loan remaining amount
	const loan = await db.teamMemberLoan.findUnique({
		where: { id: data.loanId },
	});

	if (!loan) {
		throw new Error("Loan not found");
	}

	const newRemainingAmount = Number(loan.remainingAmount) - data.amount;
	const status = newRemainingAmount <= 0 ? "paid" : "partial";

	await db.teamMemberLoan.update({
		where: { id: data.loanId },
		data: {
			remainingAmount: newRemainingAmount,
			status,
		},
	});

	return db.loanPayment.create({
		data,
	});
}

export async function getLoanPayments(loanId: string) {
	return db.loanPayment.findMany({
		where: { loanId },
		orderBy: {
			paymentDate: "desc",
		},
	});
}

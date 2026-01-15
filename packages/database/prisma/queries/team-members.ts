import type { TeamMemberUpdateInput } from "../generated/models/TeamMember";
import { db } from "../client";

export async function getTeamMemberById(id: string) {
	return db.teamMember.findUnique({
		where: { id },
		include: {
			expenseAccount: true,
			accounts: {
				include: {
					account: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
				},
			},
			_count: {
				select: {
					expenses: true,
					loans: true,
				},
			},
		},
	});
}

export async function getTeamMembersByBusinessId(businessId: string) {
	return db.teamMember.findMany({
		where: {
			OR: [
				{ businessId },
				{ accounts: { some: { accountId: businessId } } },
			],
		},
		include: {
			accounts: {
				include: {
					account: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
				},
			},
			_count: {
				select: {
					expenses: true,
					loans: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
}

export async function getAllTeamMembersByOrganizationId(
	organizationId: string,
	options?: {
		accountIds?: string[];
		status?: string;
		search?: string;
	},
) {
	const where: any = {
		OR: [
			{
				expenseAccount: {
					organizationId,
				},
			},
			{
				accounts: {
					some: {
						account: {
							organizationId,
						},
					},
				},
			},
		],
	};

	if (options?.accountIds && options.accountIds.length > 0) {
		where.OR = [
			{ businessId: { in: options.accountIds } },
			{ accounts: { some: { accountId: { in: options.accountIds } } } },
		];
	}

	if (options?.status) {
		where.status = options.status;
	}

	if (options?.search) {
		where.OR = [
			...(where.OR || []),
			{ name: { contains: options.search, mode: "insensitive" } },
			{ email: { contains: options.search, mode: "insensitive" } },
		];
	}

	return db.teamMember.findMany({
		where,
		include: {
			accounts: {
				include: {
					account: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
				},
			},
			_count: {
				select: {
					expenses: true,
					loans: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
}

export async function createTeamMember(data: {
	businessId?: string;
	name: string;
	email?: string;
	position?: string;
	joinedDate?: Date;
	salary?: number;
	status?: string;
	notes?: string;
	accountAssociations?: Array<{
		accountId: string;
		position?: string;
		joinedDate?: Date;
		salary?: number;
	}>;
}) {
	const { accountAssociations, ...memberData } = data;

	const teamMember = await db.teamMember.create({
		data: memberData,
	});

	if (accountAssociations && accountAssociations.length > 0) {
		await db.teamMemberAccount.createMany({
			data: accountAssociations.map((assoc) => ({
				teamMemberId: teamMember.id,
				accountId: assoc.accountId,
				position: assoc.position,
				joinedDate: assoc.joinedDate,
				salary: assoc.salary,
			})),
		});
	}

	return db.teamMember.findUnique({
		where: { id: teamMember.id },
		include: {
			accounts: {
				include: {
					account: {
						select: {
							id: true,
							name: true,
							currency: true,
						},
					},
				},
			},
		},
	});
}

export async function updateTeamMember(
	data: TeamMemberUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;
	return db.teamMember.update({
		where: { id },
		data: updateData as TeamMemberUpdateInput,
	});
}

export async function deleteTeamMember(id: string) {
	return db.teamMember.delete({
		where: { id },
	});
}

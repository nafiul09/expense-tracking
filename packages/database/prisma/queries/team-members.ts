import type { TeamMemberUpdateInput } from "../generated/models/TeamMember";
import { db } from "../client";

export async function getTeamMemberById(id: string) {
	return db.teamMember.findUnique({
		where: { id },
		include: {
			business: true,
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
		where: { businessId },
		include: {
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
	businessId: string;
	name: string;
	email?: string;
	position?: string;
	joinedDate?: Date;
	salary?: number;
	status?: string;
	notes?: string;
}) {
	return db.teamMember.create({
		data,
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

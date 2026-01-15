import { createTeamMemberProcedure } from "./procedures/create-team-member";
import { deleteTeamMemberProcedure } from "./procedures/delete-team-member";
import { getTeamMemberDetailsProcedure } from "./procedures/get-team-member-details";
import { listTeamMembersProcedure } from "./procedures/list-team-members";
import { updateTeamMemberProcedure } from "./procedures/update-team-member";

export const teamMembersRouter = {
	create: createTeamMemberProcedure,
	update: updateTeamMemberProcedure,
	delete: deleteTeamMemberProcedure,
	list: listTeamMembersProcedure,
	getDetails: getTeamMemberDetailsProcedure,
};

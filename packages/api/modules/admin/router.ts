import { findOrganization } from "./procedures/find-organization";
import { getDashboardStats } from "./procedures/get-dashboard-stats";
import { listOrganizations } from "./procedures/list-organizations";
import { listUsers } from "./procedures/list-users";

export const adminRouter = {
	dashboard: {
		getStats: getDashboardStats,
	},
	users: {
		list: listUsers,
	},
	organizations: {
		list: listOrganizations,
		find: findOrganization,
	},
};

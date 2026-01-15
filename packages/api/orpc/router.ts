import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { domainsRouter } from "../modules/domains/router";
import { expensesRouter } from "../modules/expenses/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { usageRouter } from "../modules/usage/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
	admin: adminRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	usage: usageRouter,
	domains: domainsRouter,
	expenses: expensesRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;

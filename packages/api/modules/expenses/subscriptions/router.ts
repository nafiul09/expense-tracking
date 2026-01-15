import { cancelSubscriptionProcedure } from "./procedures/cancel-subscription";
import { createStandaloneSubscriptionProcedure } from "./procedures/create-standalone-subscription";
import { createSubscriptionProcedure } from "./procedures/create-subscription";
import { deactivateSubscriptionProcedure } from "./procedures/deactivate-subscription";
import { deleteSubscriptionProcedure } from "./procedures/delete-subscription";
import { getSubscriptionDetailsProcedure } from "./procedures/get-subscription-details";
import { getUpcomingRenewalsProcedure } from "./procedures/get-upcoming-renewals";
import { listAllSubscriptionsProcedure } from "./procedures/list-all-subscriptions";
import { listSubscriptionsProcedure } from "./procedures/list-subscriptions";
import { updateReminderSettingsProcedure } from "./procedures/update-reminder-settings";
import { updateSubscriptionProcedure } from "./procedures/update-subscription";

export const subscriptionsRouter = {
	create: createSubscriptionProcedure,
	createStandalone: createStandaloneSubscriptionProcedure,
	list: listSubscriptionsProcedure,
	listAll: listAllSubscriptionsProcedure,
	getDetails: getSubscriptionDetailsProcedure,
	getUpcomingRenewals: getUpcomingRenewalsProcedure,
	cancel: cancelSubscriptionProcedure,
	update: updateSubscriptionProcedure,
	deactivate: deactivateSubscriptionProcedure,
	delete: deleteSubscriptionProcedure,
	updateReminderSettings: updateReminderSettingsProcedure,
};

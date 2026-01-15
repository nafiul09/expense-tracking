import { cancelSubscriptionProcedure } from "./procedures/cancel-subscription";
import { createSubscriptionProcedure } from "./procedures/create-subscription";
import { getUpcomingRenewalsProcedure } from "./procedures/get-upcoming-renewals";
import { listSubscriptionsProcedure } from "./procedures/list-subscriptions";
import { listAllSubscriptionsProcedure } from "./procedures/list-all-subscriptions";
import { updateReminderSettingsProcedure } from "./procedures/update-reminder-settings";

export const subscriptionsRouter = {
	create: createSubscriptionProcedure,
	list: listSubscriptionsProcedure,
	listAll: listAllSubscriptionsProcedure,
	getUpcomingRenewals: getUpcomingRenewalsProcedure,
	cancel: cancelSubscriptionProcedure,
	updateReminderSettings: updateReminderSettingsProcedure,
};

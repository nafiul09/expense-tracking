import { connectCustomDomain } from "./procedures/connect-custom-domain";
import { getCustomDomainStatus } from "./procedures/get-custom-domain-status";
import { removeCustomDomain } from "./procedures/remove-custom-domain";
import { toggleCustomDomain } from "./procedures/toggle-custom-domain";
import { verifyCustomDomain } from "./procedures/verify-custom-domain";

export const domainsRouter = {
	connectCustomDomain,
	removeCustomDomain,
	toggleCustomDomain,
	getCustomDomainStatus,
	verifyCustomDomain,
};

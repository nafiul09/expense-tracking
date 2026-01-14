import { getOrganizationById, updateOrganization } from "@repo/database";

export async function setCustomerIdToEntity(
	customerId: string,
	organizationId: string,
) {
	await updateOrganization({
		id: organizationId,
		paymentsCustomerId: customerId,
	});
}

export const getCustomerIdFromEntity = async (organizationId: string) => {
	return (
		(await getOrganizationById(organizationId))?.paymentsCustomerId ?? null
	);
};

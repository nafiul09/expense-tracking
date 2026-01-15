import type { PaymentMethodUpdateInput } from "../generated/models/PaymentMethod";
import { db } from "../client";

export async function getPaymentMethodById(id: string) {
	return db.paymentMethod.findUnique({
		where: { id },
	});
}

export async function getPaymentMethodsByOrganizationId(organizationId: string) {
	return db.paymentMethod.findMany({
		where: { organizationId },
		orderBy: {
			isDefault: "desc",
		},
	});
}

export async function createPaymentMethod(data: {
	organizationId: string;
	name: string;
	type: string;
	lastFourDigits?: string;
	isDefault?: boolean;
}) {
	// If this is set as default, unset other defaults
	if (data.isDefault) {
		await db.paymentMethod.updateMany({
			where: {
				organizationId: data.organizationId,
				isDefault: true,
			},
			data: {
				isDefault: false,
			},
		});
	}

	return db.paymentMethod.create({
		data,
	});
}

export async function updatePaymentMethod(
	data: PaymentMethodUpdateInput & { id: string },
) {
	const { id, ...updateData } = data;

	// If setting as default, unset other defaults
	if (updateData.isDefault) {
		const paymentMethod = await db.paymentMethod.findUnique({
			where: { id },
		});

		if (paymentMethod) {
			await db.paymentMethod.updateMany({
				where: {
					organizationId: paymentMethod.organizationId,
					isDefault: true,
					id: { not: id },
				},
				data: {
					isDefault: false,
				},
			});
		}
	}

	return db.paymentMethod.update({
		where: { id },
		data: updateData as PaymentMethodUpdateInput,
	});
}

export async function deletePaymentMethod(id: string) {
	return db.paymentMethod.delete({
		where: { id },
	});
}

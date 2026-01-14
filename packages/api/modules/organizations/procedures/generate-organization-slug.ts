import { ORPCError } from "@orpc/client";
import { getOrganizationBySlug } from "@repo/database";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";

// Custom alphabet: 0-9, a-z, A-Z (62 characters total)
// Only alphanumeric characters for maximum browser compatibility
const ALPHANUMERIC_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Create custom nanoid generator with alphanumeric-only alphabet
const generateSlug = customAlphabet(ALPHANUMERIC_ALPHABET, 8);

export const generateOrganizationSlug = publicProcedure
	.route({
		method: "GET",
		path: "/organizations/generate-slug",
		tags: ["Organizations"],
		summary: "Generate organization slug",
		description:
			"Generate a unique random alphanumeric slug for an organization",
	})
	.input(
		z.object({
			name: z.string().optional(),
		}),
	)
	.handler(async () => {
		const MAX_RETRIES = 10;
		let hasAvailableSlug = false;
		let slug = "";

		for (let i = 0; i < MAX_RETRIES; i++) {
			slug = generateSlug();
			const existing = await getOrganizationBySlug(slug);

			if (!existing) {
				hasAvailableSlug = true;
				break;
			}
		}

		if (!hasAvailableSlug) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}

		return { slug };
	});

import z from "zod";

export const connectCustomDomainSchema = z.object({
	organizationId: z.string(),
	domain: z
		.string()
		.min(1, "Domain is required")
		.regex(
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
			"Invalid domain format",
		)
		.refine(
			(domain) =>
				!domain.startsWith("http://") && !domain.startsWith("https://"),
			"Domain should not include protocol (http:// or https://)",
		),
});

export const removeCustomDomainSchema = z.object({
	organizationId: z.string(),
});

export const toggleCustomDomainSchema = z.object({
	organizationId: z.string(),
	enabled: z.boolean(),
});

export const getCustomDomainStatusSchema = z.object({
	organizationId: z.string(),
});

export const verifyCustomDomainSchema = z.object({
	organizationId: z.string(),
});

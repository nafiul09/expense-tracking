import { logger } from "@repo/logs";

interface VercelDomainConfig {
	teamId?: string;
	projectId: string;
	authToken: string;
}

interface VercelDomainResponse {
	name: string;
	apexName: string;
	projectId: string;
	redirect?: string | null;
	redirectStatusCode?: number | null;
	gitBranch?: string | null;
	updatedAt?: number;
	createdAt?: number;
	verified: boolean;
	verification?: Array<{
		type: string;
		domain: string;
		value: string;
		reason: string;
	}>;
}

interface VercelDomainConfiguration {
	configured: boolean;
	cnameRecord?: string;
	txtRecords?: string[];
	verification?: Array<{
		type: string;
		domain: string;
		value: string;
		reason: string;
	}>;
}

export class VercelDomainService {
	private config: VercelDomainConfig;
	private baseUrl = "https://api.vercel.com";

	constructor(config: VercelDomainConfig) {
		this.config = config;
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers = new Headers(options.headers);
		headers.set("Authorization", `Bearer ${this.config.authToken}`);
		headers.set("Content-Type", "application/json");

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(`Vercel API error: ${response.status} ${errorText}`);
			throw new Error(
				`Vercel API error: ${response.status} - ${errorText}`,
			);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * Add a domain to a Vercel project
	 */
	async addDomain(domain: string): Promise<{
		configured: boolean;
		verification?: VercelDomainResponse["verification"];
	}> {
		const endpoint = this.config.teamId
			? `/v10/projects/${this.config.projectId}/domains?teamId=${this.config.teamId}`
			: `/v10/projects/${this.config.projectId}/domains`;

		try {
			const response = await this.makeRequest<VercelDomainResponse>(
				endpoint,
				{
					method: "POST",
					body: JSON.stringify({ name: domain }),
				},
			);

			return {
				configured: response.verified,
				verification: response.verification,
			};
		} catch (error) {
			logger.error("Failed to add domain to Vercel:", error);
			throw error;
		}
	}

	/**
	 * Verify domain configuration status
	 */
	async verifyDomain(domain: string): Promise<{ verified: boolean }> {
		const endpoint = this.config.teamId
			? `/v9/projects/${this.config.projectId}/domains/${domain}?teamId=${this.config.teamId}`
			: `/v9/projects/${this.config.projectId}/domains/${domain}`;

		try {
			const response = await this.makeRequest<VercelDomainResponse>(
				endpoint,
				{
					method: "GET",
				},
			);

			return {
				verified: response.verified,
			};
		} catch (error) {
			logger.error("Failed to verify domain:", error);
			throw error;
		}
	}

	/**
	 * Remove a domain from a Vercel project
	 */
	async removeDomain(domain: string): Promise<void> {
		const endpoint = this.config.teamId
			? `/v9/projects/${this.config.projectId}/domains/${domain}?teamId=${this.config.teamId}`
			: `/v9/projects/${this.config.projectId}/domains/${domain}`;

		try {
			await this.makeRequest(endpoint, {
				method: "DELETE",
			});
		} catch (error) {
			logger.error("Failed to remove domain from Vercel:", error);
			throw error;
		}
	}

	/**
	 * Check domain configuration and return DNS records needed
	 */
	async checkConfiguration(
		domain: string,
	): Promise<VercelDomainConfiguration> {
		const endpoint = this.config.teamId
			? `/v9/projects/${this.config.projectId}/domains/${domain}?teamId=${this.config.teamId}`
			: `/v9/projects/${this.config.projectId}/domains/${domain}`;

		try {
			const response = await this.makeRequest<VercelDomainResponse>(
				endpoint,
				{
					method: "GET",
				},
			);

			const txtRecords: string[] = [];
			const cnameRecord = response.verification?.find(
				(v) => v.type === "CNAME",
			)?.value;

			response.verification?.forEach((v) => {
				if (v.type === "TXT") {
					txtRecords.push(v.value);
				}
			});

			return {
				configured: response.verified,
				cnameRecord,
				txtRecords: txtRecords.length > 0 ? txtRecords : undefined,
				verification: response.verification,
			};
		} catch (error) {
			logger.error("Failed to check domain configuration:", error);
			throw error;
		}
	}
}

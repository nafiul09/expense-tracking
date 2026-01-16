import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/client";

const prismaClientSingleton = () => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	// Environment-aware configuration
	const isDev = process.env.NODE_ENV !== "production";

	// Configure connection pool with appropriate settings per environment
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,

		// Connection pool limits (smaller in dev, larger in production)
		max: isDev ? 10 : 20, // Max concurrent connections
		min: isDev ? 2 : 5, // Keep warm connections ready

		// Timeouts - Allow enough time for cold starts on free tier services
		connectionTimeoutMillis: 30000, // 30s to establish connection (Neon free tier can be slow)
		idleTimeoutMillis: isDev ? 30000 : 60000, // Close idle connections after
		statement_timeout: isDev ? 20000 : 30000, // Max query execution time (20s dev, 30s prod)

		// Keep connections alive (prevents drops by firewalls/proxies)
		keepAlive: true,
		keepAliveInitialDelayMillis: 10000,
	});

	const adapter = new PrismaPg(pool);

	return new PrismaClient({
		adapter,
		log: isDev ? ["error", "warn"] : ["error"],
	});
};

declare global {
	var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// biome-ignore lint/suspicious/noRedeclare: This is a singleton
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
	globalThis.prisma = prisma;
}

export { prisma as db };

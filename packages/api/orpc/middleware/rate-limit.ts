import { ORPCError, os } from "@orpc/server";

// In-memory store for rate limiting
// In production, consider using Redis for distributed systems
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per hour

/**
 * Gets the client IP address from headers
 */
function getClientIp(headers: Headers): string {
	// Check common proxy headers
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim() ?? "unknown";
	}

	const realIp = headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	// Fallback to connection IP if available
	return "unknown";
}

/**
 * Rate limiting middleware for public API endpoints
 * Limits requests to 10 per IP per hour
 */
export function rateLimitMiddleware() {
	return os
		.$context<{
			headers: Headers;
		}>()
		.middleware(async ({ context, next }) => {
			const ip = getClientIp(context.headers);

			// Security: Apply stricter rate limiting for unknown IPs
			// This prevents bypassing rate limits when IP detection fails
			if (ip === "unknown") {
				// In production, reject requests with unknown IPs
				if (process.env.NODE_ENV === "production") {
					throw new ORPCError("BAD_REQUEST");
				}
				// In development, apply a stricter limit for unknown IPs
				const unknownIpKey = "unknown-ip";
				const now = Date.now();
				const record = rateLimitStore.get(unknownIpKey);

				if (!record || now > record.resetAt) {
					rateLimitStore.set(unknownIpKey, {
						count: 1,
						resetAt: now + RATE_LIMIT_WINDOW,
					});
					return await next();
				}

				if (record.count >= 5) {
					// Stricter limit for unknown IPs
					throw new ORPCError("TOO_MANY_REQUESTS");
				}

				record.count++;
				rateLimitStore.set(unknownIpKey, record);
				return await next();
			}

			const now = Date.now();
			const record = rateLimitStore.get(ip);

			if (!record || now > record.resetAt) {
				// Create new record or reset expired one
				rateLimitStore.set(ip, {
					count: 1,
					resetAt: now + RATE_LIMIT_WINDOW,
				});
				return await next();
			}

			if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
				throw new ORPCError("TOO_MANY_REQUESTS");
			}

			// Increment count
			record.count++;
			rateLimitStore.set(ip, record);

			// Clean up old entries periodically to prevent memory leaks
			if (rateLimitStore.size > 1000) {
				for (const [key, value] of rateLimitStore.entries()) {
					if (now > value.resetAt) {
						rateLimitStore.delete(key);
					}
				}
			}

			return await next();
		});
}

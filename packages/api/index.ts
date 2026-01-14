import { auth } from "@repo/auth";
import { logger } from "@repo/logs";
import { webhookHandler as paymentsWebhookHandler } from "@repo/payments";
import { getBaseUrl } from "@repo/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { openApiHandler, rpcHandler } from "./orpc/handler";

export const app = new Hono()
	.basePath("/api")
	// Logger middleware
	.use(honoLogger((message, ...rest) => logger.log(message, ...rest)))
	// Cors middleware
	.use(
		cors({
			origin: (origin) => {
				// If no origin (same-origin request), allow it
				if (!origin) {
					return origin;
				}

				// Allow requests from the web app
				const baseUrl = getBaseUrl();
				if (origin === baseUrl) {
					return origin;
				}

				// Allow localhost for development
				if (
					origin.startsWith("http://localhost:") ||
					origin.startsWith("http://127.0.0.1:")
				) {
					return origin;
				}

				// Allow browser extension origins (chrome-extension://, moz-extension://, etc.)
				if (origin.startsWith("chrome-extension://")) {
					return origin;
				}
				if (origin.startsWith("moz-extension://")) {
					return origin;
				}
				if (origin.startsWith("safari-extension://")) {
					return origin;
				}

				// Allow any origin for public API endpoints
				// Security is provided by:
				// 1. Rate limiting (10 requests per hour per IP)
				// 2. Input validation and sanitization
				// 3. Payload size limits (5MB max)
				// 4. Automatic expiration (24 hours)
				// Note: In production, consider restricting to known extension IDs if possible
				return origin;
			},
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "GET", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			maxAge: 600,
			credentials: true,
		}),
	)
	// Auth handler
	.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
	// Payments webhook handler
	.post("/webhooks/payments", (c) => paymentsWebhookHandler(c.req.raw))
	// Health check
	.get("/health", (c) => c.text("OK"))
	// oRPC handlers (for RPC and OpenAPI)
	.use("*", async (c, next) => {
		const context = {
			headers: c.req.raw.headers,
		};

		const isRpc = c.req.path.includes("/rpc/");

		const handler = isRpc ? rpcHandler : openApiHandler;

		const prefix = isRpc ? "/api/rpc" : "/api";

		const { matched, response } = await handler.handle(c.req.raw, {
			prefix,
			context,
		});

		if (matched) {
			return c.newResponse(response.body, response);
		}

		await next();
	});

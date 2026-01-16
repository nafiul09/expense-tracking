// @ts-expect-error - PrismaPlugin is not typed
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./modules/i18n/request.ts");

const nextConfig: NextConfig = {
	transpilePackages: ["@repo/api", "@repo/auth", "@repo/database"],
	images: {
		remotePatterns: [
			{
				// google profile images
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				// github profile images
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				// share OG images
				protocol: "https",
				hostname: "share-og.webclarity.ai",
			},
			{
				// google favicons for subscriptions
				protocol: "https",
				hostname: "www.google.com",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/:organizationSlug/settings",
				destination: "/:organizationSlug/settings/general",
				permanent: true,
			},
			// Legacy redirects for old URLs
			{
				source: "/app/admin/:path*",
				destination: "/admin/:path*",
				permanent: true,
			},
			{
				source: "/app/:organizationSlug/:path*",
				destination: "/:organizationSlug/:path*",
				permanent: true,
			},
			{
				source: "/workspace/:organizationSlug/:path*",
				destination: "/:organizationSlug/:path*",
				permanent: true,
			},
			// Catch-all redirect for /app without params (from old verification emails)
			{
				source: "/app",
				destination: "/",
				permanent: false, // Use temporary redirect since this is for migration
			},
			{
				source: "/workspace",
				destination: "/",
				permanent: true,
			},
		];
	},
	webpack: (config, { webpack, isServer }) => {
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
			}),
		);

		if (isServer) {
			config.plugins.push(new PrismaPlugin());
		}

		return config;
	},
};

export default withNextIntl(nextConfig);

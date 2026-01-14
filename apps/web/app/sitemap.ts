import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// SaaS-only app - no public pages to index
	return [];
}

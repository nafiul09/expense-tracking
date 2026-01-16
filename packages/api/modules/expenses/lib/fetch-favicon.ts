/**
 * Fetches favicon URL from a website URL
 * Uses Google's favicon service as a fallback
 */
export async function fetchFavicon(websiteUrl: string): Promise<string | null> {
	if (!websiteUrl) return null;

	try {
		// Parse URL to get domain
		let url: URL;
		try {
			url = new URL(websiteUrl);
		} catch {
			// If invalid URL, try adding https://
			try {
				url = new URL(`https://${websiteUrl}`);
			} catch {
				return null;
			}
		}

		const domain = url.hostname;

		// Use Google's favicon service as a reliable fallback
		// Format: https://www.google.com/s2/favicons?domain=example.com&sz=64
		const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

		return faviconUrl;
	} catch (error) {
		console.error("Error fetching favicon:", error);
		return null;
	}
}

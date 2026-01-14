export type SearchResultType = "share" | "project" | "board"; // Extensible for future

export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string;
	subtitle?: string;
	url: string;
	metadata?: Record<string, any>;
}

export interface ShareSearchResult extends SearchResult {
	type: "share";
	shareType: "STYLE_GUIDE" | "HEADING_STRUCTURE";
	isExpired: boolean;
	viewCount: number;
	metadata: {
		websiteUrl: string;
		shareOgImageUrl: string | null;
	};
}

const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`);
	if (!res.ok) {
		throw new Error(`API error: ${res.status}`);
	}
	return res.json() as Promise<T>;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface AuctionItem {
	id: number;
	case_no: string;
	item_no: number;
	court_name?: string;
	court_code?: string;
	address_full?: string;
	sido?: string;
	sigu?: string;
	dong?: string;
	latitude?: number;
	longitude?: number;
	item_type?: string;
	item_detail?: string;
	land_area?: number;
	building_area?: number;
	floor_info?: string;
	appraisal_price?: number;
	min_bid_price?: number;
	bid_rate?: number;
	sale_date?: string;
	sale_time?: string;
	status?: string;
	fail_count?: number;
	winning_price?: number;
	winning_rate?: number;
	appraisal_pdf_url?: string;
	survey_pdf_url?: string;
	spec_pdf_url?: string;
	created_at?: string;
	updated_at?: string;
}

export interface SaleHistory {
	id: number;
	auction_item_id: number;
	sale_date?: string;
	min_bid_price?: number;
	result?: string;
	winning_price?: number;
	bidder_count?: number;
}

export interface RegionStat {
	sido: string;
	count: number;
	avg_winning_rate?: number;
	avg_appraisal_price?: number;
}

export interface SearchParams {
	sido?: string;
	sigu?: string;
	dong?: string;
	type?: string;
	court?: string;
	priceMin?: string;
	priceMax?: string;
	bidMin?: string;
	bidMax?: string;
	dateFrom?: string;
	dateTo?: string;
	status?: string;
	failCount?: string;
	sort?: string;
	order?: string;
	page?: string;
	limit?: string;
}

export const api = {
	getItems(params: SearchParams = {}) {
		const qs = new URLSearchParams(
			Object.entries(params).filter(([, v]) => v != null && v !== ""),
		).toString();
		return fetchJson<PaginatedResponse<AuctionItem>>(
			`/items${qs ? `?${qs}` : ""}`,
		);
	},

	getItem(caseNo: string) {
		return fetchJson<{ data: AuctionItem }>(
			`/items/${encodeURIComponent(caseNo)}`,
		);
	},

	getHistory(caseNo: string) {
		return fetchJson<{ data: SaleHistory[] }>(
			`/items/${encodeURIComponent(caseNo)}/history`,
		);
	},

	getRegionStats() {
		return fetchJson<{ data: RegionStat[] }>("/stats/region");
	},

	getTypeStats() {
		return fetchJson<{ data: { item_type: string; count: number }[] }>(
			"/stats/type",
		);
	},

	getCourts() {
		return fetchJson<{
			data: { id: number; court_code: string; court_name: string }[];
		}>("/codes/courts");
	},

	getRegions(sido?: string) {
		const qs = sido ? `?sido=${encodeURIComponent(sido)}` : "";
		return fetchJson<{ data: { sido_code?: string; sido_name?: string; sigu_code?: string; sigu_name?: string }[] }>(
			`/codes/regions${qs}`,
		);
	},
};

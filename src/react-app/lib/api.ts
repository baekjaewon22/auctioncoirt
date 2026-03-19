const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
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
	image_url?: string;
	detail_url?: string;
	views?: number;
	special_rights?: string;
	// 확장 필드
	auction_type?: string;
	auction_target?: string;
	bid_method?: string;
	bid_deposit?: number;
	claim_amount?: number;
	debtor?: string;
	creditor?: string;
	related_case?: string;
	appraiser?: string;
	appraisal_date?: string;
	appraisal_summary?: string;
	tenant_info?: string;
	registry_info?: string;
	expected_dividend?: string;
	real_trade_info?: string;
	caution_notes?: string;
	documents?: string;
	all_images?: string;
	source_url?: string;
	created_at?: string;
	updated_at?: string;
}

export interface SearchParams {
	sido?: string;
	sigu?: string;
	type?: string;
	status?: string;
	priceMin?: string;
	priceMax?: string;
	failCount?: string;
	sort?: string;
	order?: string;
	page?: string;
	limit?: string;
	[key: string]: string | undefined;
}

export const api = {
	getItems(params: SearchParams = {}) {
		const qs = new URLSearchParams(
			Object.entries(params).filter((e): e is [string, string] => e[1] != null && e[1] !== ""),
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
		return fetchJson<{ data: unknown[] }>(
			`/items/${encodeURIComponent(caseNo)}/history`,
		);
	},
	getRegionStats() {
		return fetchJson<{ data: { sido: string; count: number; avg_winning_rate?: number }[] }>("/stats/region");
	},
	getTypeStats() {
		return fetchJson<{ data: { item_type: string; count: number }[] }>("/stats/type");
	},
	getCourts() {
		return fetchJson<{ data: { id: number; court_code: string; court_name: string }[] }>("/codes/courts");
	},
	getRegions(sido?: string) {
		const qs = sido ? `?sido=${encodeURIComponent(sido)}` : "";
		return fetchJson<{ data: { sido_code?: string; sido_name?: string }[] }>(`/codes/regions${qs}`);
	},
};

export function formatPrice(price?: number | null): string {
	if (!price) return "-";
	if (price >= 100000000) {
		const eok = Math.floor(price / 100000000);
		const man = Math.floor((price % 100000000) / 10000);
		return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
	}
	if (price >= 10000) return `${Math.floor(price / 10000).toLocaleString()}만`;
	return price.toLocaleString();
}

export function formatPriceRaw(price?: number | null): string {
	if (!price) return "-";
	return price.toLocaleString() + "원";
}

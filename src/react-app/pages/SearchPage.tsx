import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";

const PRICE_OPTIONS = [
	{ label: "전체", value: "" },
	{ label: "1천만 이하", value: "10000000" },
	{ label: "5천만 이하", value: "50000000" },
	{ label: "1억 이하", value: "100000000" },
	{ label: "3억 이하", value: "300000000" },
	{ label: "5억 이하", value: "500000000" },
	{ label: "10억 이하", value: "1000000000" },
];

export default function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const filters = {
		sido: searchParams.get("sido") ?? undefined,
		sigu: searchParams.get("sigu") ?? undefined,
		type: searchParams.get("type") ?? undefined,
		status: searchParams.get("status") ?? undefined,
		priceMax: searchParams.get("priceMax") ?? undefined,
		failCount: searchParams.get("failCount") ?? undefined,
		page: searchParams.get("page") ?? "1",
		limit: searchParams.get("limit") ?? "20",
		sort: searchParams.get("sort") ?? "sale_date",
		order: searchParams.get("order") ?? "asc",
	};

	const { data, isLoading } = useQuery({
		queryKey: ["items", filters],
		queryFn: () => api.getItems(filters),
	});

	const setFilter = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		params.set("page", "1");
		setSearchParams(params);
	};

	const setPage = (page: number) => {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(page));
		setSearchParams(params);
	};

	const resetFilters = () => {
		setSearchParams({});
	};

	const formatPrice = (price?: number) => {
		if (!price) return "-";
		if (price >= 100000000) return `${(price / 100000000).toFixed(1)}억`;
		if (price >= 10000) return `${(price / 10000).toFixed(0)}만`;
		return price.toLocaleString();
	};

	const currentPage = Number(filters.page) || 1;

	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold text-gray-900">물건 검색</h2>
				<button
					onClick={resetFilters}
					className="text-xs text-gray-400 hover:text-gray-600"
				>
					필터 초기화
				</button>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.sido ?? ""}
						onChange={(e) => setFilter("sido", e.target.value)}
					>
						<option value="">시/도 전체</option>
						<option>서울</option>
						<option>경기</option>
						<option>인천</option>
						<option>부산</option>
						<option>대구</option>
						<option>대전</option>
						<option>광주</option>
						<option>울산</option>
						<option>강원</option>
						<option>충북</option>
						<option>충남</option>
						<option>전북</option>
						<option>전남</option>
						<option>경북</option>
						<option>경남</option>
						<option>제주</option>
					</select>
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.type ?? ""}
						onChange={(e) => setFilter("type", e.target.value)}
					>
						<option value="">물건종류 전체</option>
						<option>아파트</option>
						<option>빌라/연립</option>
						<option>오피스텔</option>
						<option>단독/다가구</option>
						<option>상가</option>
						<option>토지</option>
					</select>
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.status ?? ""}
						onChange={(e) => setFilter("status", e.target.value)}
					>
						<option value="">상태 전체</option>
						<option>신건</option>
						<option>진행중</option>
						<option>유찰</option>
						<option>낙찰</option>
					</select>
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.priceMax ?? ""}
						onChange={(e) => setFilter("priceMax", e.target.value)}
					>
						<option value="">감정가 전체</option>
						{PRICE_OPTIONS.filter((o) => o.value).map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.failCount ?? ""}
						onChange={(e) => setFilter("failCount", e.target.value)}
					>
						<option value="">유찰횟수</option>
						<option value="1">1회 이상</option>
						<option value="2">2회 이상</option>
						<option value="3">3회 이상</option>
						<option value="5">5회 이상</option>
					</select>
					<select
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
						value={filters.sort ?? "sale_date"}
						onChange={(e) => setFilter("sort", e.target.value)}
					>
						<option value="sale_date">매각기일순</option>
						<option value="appraisal_price">감정가순</option>
						<option value="min_bid_price">최저가순</option>
						<option value="created_at">등록일순</option>
					</select>
				</div>
			</div>

			{/* Results */}
			{isLoading ? (
				<div className="text-center py-12 text-gray-400">로딩 중...</div>
			) : !data || data.data.length === 0 ? (
				<div className="text-center py-12 text-gray-400">
					검색 결과가 없습니다
				</div>
			) : (
				<>
					<p className="text-sm text-gray-500 mb-3">
						총 {data.pagination.total.toLocaleString()}건
					</p>
					<div className="space-y-3">
						{data.data.map((item) => (
							<Link
								key={item.id}
								to={`/items/${encodeURIComponent(item.case_no)}`}
								className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
							>
								<div className="flex flex-col sm:flex-row sm:justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="flex flex-wrap items-center gap-1.5 mb-1">
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
												{item.item_type ?? "기타"}
											</span>
											<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
												{item.status ?? "진행중"}
											</span>
											{item.fail_count != null && item.fail_count > 0 && (
												<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
													유찰 {item.fail_count}회
												</span>
											)}
										</div>
										<p className="text-sm font-medium text-gray-900 truncate">
											{item.address_full ?? item.case_no}
										</p>
										<p className="text-xs text-gray-400 mt-1">
											{item.case_no} | {item.court_name}
										</p>
									</div>
									<div className="flex sm:flex-col gap-4 sm:gap-0 sm:text-right shrink-0">
										<div>
											<p className="text-xs text-gray-400">감정가</p>
											<p className="text-sm font-bold text-gray-900">
												{formatPrice(item.appraisal_price)}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-400">최저가</p>
											<p className="text-sm font-bold text-blue-600">
												{formatPrice(item.min_bid_price)}
											</p>
										</div>
									</div>
								</div>
								{item.sale_date && (
									<p className="text-xs text-gray-400 mt-2">
										매각기일: {item.sale_date} {item.sale_time ?? ""}
									</p>
								)}
							</Link>
						))}
					</div>

					{/* Pagination */}
					{data.pagination.totalPages > 1 && (
						<Pagination
							currentPage={currentPage}
							totalPages={data.pagination.totalPages}
							onPageChange={setPage}
						/>
					)}
				</>
			)}
		</div>
	);
}

function Pagination({
	currentPage,
	totalPages,
	onPageChange,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	const pageWindow = 5;
	const start = Math.max(1, currentPage - Math.floor(pageWindow / 2));
	const end = Math.min(totalPages, start + pageWindow - 1);
	const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

	return (
		<div className="flex justify-center items-center gap-1 mt-6">
			<button
				onClick={() => onPageChange(Math.max(1, currentPage - 1))}
				disabled={currentPage === 1}
				className="px-2 py-1 text-sm text-gray-500 disabled:opacity-30"
			>
				&lsaquo;
			</button>
			{start > 1 && (
				<>
					<button
						onClick={() => onPageChange(1)}
						className="px-3 py-1 text-sm rounded bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
					>
						1
					</button>
					{start > 2 && <span className="text-gray-400 text-sm">...</span>}
				</>
			)}
			{pages.map((p) => (
				<button
					key={p}
					onClick={() => onPageChange(p)}
					className={`px-3 py-1 text-sm rounded ${
						p === currentPage
							? "bg-blue-600 text-white"
							: "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
					}`}
				>
					{p}
				</button>
			))}
			{end < totalPages && (
				<>
					{end < totalPages - 1 && (
						<span className="text-gray-400 text-sm">...</span>
					)}
					<button
						onClick={() => onPageChange(totalPages)}
						className="px-3 py-1 text-sm rounded bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
					>
						{totalPages}
					</button>
				</>
			)}
			<button
				onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
				disabled={currentPage === totalPages}
				className="px-2 py-1 text-sm text-gray-500 disabled:opacity-30"
			>
				&rsaquo;
			</button>
		</div>
	);
}

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const filters = {
		sido: searchParams.get("sido") ?? undefined,
		sigu: searchParams.get("sigu") ?? undefined,
		type: searchParams.get("type") ?? undefined,
		status: searchParams.get("status") ?? undefined,
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

	const formatPrice = (price?: number) => {
		if (!price) return "-";
		if (price >= 100000000) return `${(price / 100000000).toFixed(1)}억`;
		if (price >= 10000) return `${(price / 10000).toFixed(0)}만`;
		return price.toLocaleString();
	};

	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<h2 className="text-xl font-bold text-gray-900 mb-4">물건 검색</h2>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
							<a
								key={item.id}
								href={`/items/${encodeURIComponent(item.case_no)}`}
								className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
							>
								<div className="flex justify-between items-start">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
												{item.item_type ?? "기타"}
											</span>
											<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
												{item.status ?? "진행중"}
											</span>
											{item.fail_count && item.fail_count > 0 ? (
												<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
													유찰 {item.fail_count}회
												</span>
											) : null}
										</div>
										<p className="text-sm font-medium text-gray-900">
											{item.address_full ?? item.case_no}
										</p>
										<p className="text-xs text-gray-400 mt-1">
											{item.case_no} | {item.court_name}
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs text-gray-400">감정가</p>
										<p className="text-sm font-bold text-gray-900">
											{formatPrice(item.appraisal_price)}
										</p>
										<p className="text-xs text-gray-400 mt-1">최저가</p>
										<p className="text-sm font-bold text-blue-600">
											{formatPrice(item.min_bid_price)}
										</p>
									</div>
								</div>
								{item.sale_date && (
									<p className="text-xs text-gray-400 mt-2">
										매각기일: {item.sale_date} {item.sale_time ?? ""}
									</p>
								)}
							</a>
						))}
					</div>

					{/* Pagination */}
					{data.pagination.totalPages > 1 && (
						<div className="flex justify-center gap-2 mt-6">
							{Array.from(
								{ length: Math.min(data.pagination.totalPages, 10) },
								(_, i) => i + 1,
							).map((p) => (
								<button
									key={p}
									onClick={() => setPage(p)}
									className={`px-3 py-1 text-sm rounded ${
										p === data.pagination.page
											? "bg-blue-600 text-white"
											: "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
									}`}
								>
									{p}
								</button>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}

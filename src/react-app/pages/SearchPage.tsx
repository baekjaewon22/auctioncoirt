import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { api, formatPrice } from "../lib/api";
import { useAuth, authHeaders } from "../lib/auth";

export default function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const filters = {
		sido: searchParams.get("sido") ?? undefined,
		type: searchParams.get("type") ?? undefined,
		status: searchParams.get("status") ?? undefined,
		sort: searchParams.get("sort") ?? "sale_date",
		order: searchParams.get("order") ?? "asc",
		page: searchParams.get("page") ?? "1",
		limit: "20",
	};

	const { data, isLoading } = useQuery({
		queryKey: ["items", filters],
		queryFn: () => api.getItems(filters),
	});

	const setFilter = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams);
		if (value) params.set(key, value);
		else params.delete(key);
		params.set("page", "1");
		setSearchParams(params);
	};

	return (
		<div className="mx-auto max-w-6xl px-4 py-6">
			{/* 마이옥션 관심물건 가져오기 */}
			<CrawlBar />

			{/* 필터 바 */}
			<div className="bg-white rounded-lg shadow-sm p-4 mb-4">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<select className="border rounded px-3 py-2 text-sm" value={filters.sido ?? ""}
						onChange={(e) => setFilter("sido", e.target.value)}>
						<option value="">지역 전체</option>
						{["서울특별시","경기도","인천광역시","부산광역시","대구광역시","대전광역시","광주광역시","울산광역시"].map(s =>
							<option key={s}>{s}</option>)}
					</select>
					<select className="border rounded px-3 py-2 text-sm" value={filters.type ?? ""}
						onChange={(e) => setFilter("type", e.target.value)}>
						<option value="">물건종류 전체</option>
						{["아파트","다세대(빌라)","오피스텔","단독주택","근린주택","상가","토지","공장"].map(s =>
							<option key={s}>{s}</option>)}
					</select>
					<select className="border rounded px-3 py-2 text-sm" value={filters.status ?? ""}
						onChange={(e) => setFilter("status", e.target.value)}>
						<option value="">상태 전체</option>
						{["신건","유찰","재진행","매각","취하"].map(s =>
							<option key={s}>{s}</option>)}
					</select>
					<select className="border rounded px-3 py-2 text-sm" value={filters.sort ?? "sale_date"}
						onChange={(e) => setFilter("sort", e.target.value)}>
						<option value="sale_date">매각기일순</option>
						<option value="appraisal_price">감정가순</option>
						<option value="min_bid_price">최저가순</option>
					</select>
				</div>
			</div>

			{/* 결과 건수 */}
			{data && (
				<div className="flex items-center justify-between mb-3">
					<p className="text-sm font-medium text-gray-700">
						검색결과 : <span className="text-blue-600 font-bold">{data.pagination.total.toLocaleString()}</span> 건
					</p>
				</div>
			)}

			{/* 경매 목록 테이블 */}
			{isLoading ? (
				<div className="text-center py-20 text-gray-400">로딩 중...</div>
			) : !data || data.data.length === 0 ? (
				<div className="text-center py-20 text-gray-400">검색 결과가 없습니다</div>
			) : (
				<div className="bg-white rounded-lg shadow-sm overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b">
							<tr>
								<th className="px-3 py-2 text-left w-24">사진</th>
								<th className="px-3 py-2 text-left w-28">용도/사건</th>
								<th className="px-3 py-2 text-left">소재지 / 면적 / 특수권리</th>
								<th className="px-3 py-2 text-right w-32">감정/최저가</th>
								<th className="px-3 py-2 text-center w-24">현재상태</th>
								<th className="px-3 py-2 text-center w-24">매각기일</th>
								<th className="px-3 py-2 text-center w-16">조회</th>
							</tr>
						</thead>
						<tbody>
							{data.data.map((item) => (
								<ItemRow key={item.id} item={item} />
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* 페이지네이션 */}
			{data && data.pagination.totalPages > 1 && (
				<div className="flex justify-center gap-1 mt-6">
					{Array.from({ length: Math.min(data.pagination.totalPages, 10) }, (_, i) => i + 1).map((p) => (
						<button key={p}
							onClick={() => { const params = new URLSearchParams(searchParams); params.set("page", String(p)); setSearchParams(params); }}
							className={`px-3 py-1 text-sm rounded ${p === data.pagination.page ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
							{p}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function ItemRow({ item }: { item: ReturnType<typeof api.getItems> extends Promise<infer R> ? R extends { data: (infer T)[] } ? T : never : never }) {
	const dDay = item.sale_date ? getDday(item.sale_date) : null;

	return (
		<tr className="border-b hover:bg-blue-50/30 transition-colors">
			{/* 사진 */}
			<td className="px-3 py-3">
				<Link to={`/items/${encodeURIComponent(item.case_no)}`}>
					{item.image_url ? (
						<img src={item.image_url} alt="" className="w-20 h-16 object-cover rounded border" />
					) : (
						<div className="w-20 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-300 text-xs">No Image</div>
					)}
				</Link>
			</td>

			{/* 용도/사건 */}
			<td className="px-3 py-3">
				<span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mb-1">
					{item.item_type ?? "기타"}
				</span>
				<br />
				<span className="text-xs text-gray-500">{item.case_no}</span>
				<br />
				<span className="text-xs text-gray-400">{item.court_name}</span>
			</td>

			{/* 소재지 / 면적 / 특수권리 */}
			<td className="px-3 py-3">
				<Link to={`/items/${encodeURIComponent(item.case_no)}`} className="text-sm text-gray-900 hover:text-blue-600 hover:underline font-medium">
					{item.address_full ?? "-"}
				</Link>
				<div className="mt-1 text-xs text-gray-500">
					{item.building_area != null && <span>건물 <span className="text-pink-600 font-medium">{item.building_area}</span>평</span>}
					{item.building_area != null && item.land_area != null && <span className="mx-2">|</span>}
					{item.land_area != null && <span>토지 <span className="text-pink-600 font-medium">{item.land_area}</span>평</span>}
				</div>
				{item.special_rights && (
					<div className="mt-1">
						{item.special_rights.split(",").map((r, i) => (
							<span key={i} className="inline-block bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded mr-1">{r.trim()}</span>
						))}
					</div>
				)}
			</td>

			{/* 감정/최저가 */}
			<td className="px-3 py-3 text-right">
				<div className="text-sm text-gray-900">{formatPrice(item.appraisal_price)}</div>
				<div className="text-sm font-bold text-blue-600">{formatPrice(item.min_bid_price)}</div>
				{item.winning_price != null && (
					<div className="text-sm font-bold text-pink-600">{formatPrice(item.winning_price)}</div>
				)}
			</td>

			{/* 현재상태 */}
			<td className="px-3 py-3 text-center">
				<StatusBadge status={item.status} />
				{item.bid_rate != null && (
					<div className="text-xs text-blue-600 mt-0.5">({item.bid_rate}%)</div>
				)}
			</td>

			{/* 매각기일 */}
			<td className="px-3 py-3 text-center">
				<div className="text-xs text-gray-700">{item.sale_date ?? "-"}</div>
				{dDay !== null && dDay >= 0 && (
					<div className={`text-[10px] mt-0.5 font-medium ${dDay === 0 ? "text-pink-600" : dDay <= 7 ? "text-orange-500" : "text-gray-400"}`}>
						{dDay === 0 ? "오늘입찰" : `입찰 ${dDay}일전`}
					</div>
				)}
			</td>

			{/* 조회수 */}
			<td className="px-3 py-3 text-center text-xs text-gray-400">
				{item.views ?? 0}
			</td>
		</tr>
	);
}

function StatusBadge({ status }: { status?: string }) {
	if (!status) return <span className="text-xs text-gray-400">-</span>;
	let color = "bg-gray-100 text-gray-600";
	if (status.includes("유찰")) color = "bg-orange-100 text-orange-700";
	else if (status.includes("재진행")) color = "bg-yellow-100 text-yellow-700";
	else if (status.includes("매각")) color = "bg-green-100 text-green-700";
	else if (status.includes("신건")) color = "bg-blue-100 text-blue-700";
	else if (status.includes("취하")) color = "bg-gray-100 text-gray-500";
	return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${color}`}>{status}</span>;
}

function CrawlBar() {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const [crawling, setCrawling] = useState(false);
	const [result, setResult] = useState<{ count: number; items: { case_no: string; item_type: string; address: string }[] } | null>(null);
	const [error, setError] = useState("");

	if (!user) return null;

	const handleCrawl = async () => {
		setCrawling(true);
		setError("");
		setResult(null);

		// 사용자 설정에서 마이옥션 계정 가져오기
		let myId = "";
		let myPw = "";
		try {
			const res = await fetch("/api/settings", { headers: authHeaders() });
			const d = await res.json() as { data?: Record<string, string> };
			// 마스킹된 값이 올 수 있으므로 실제 값은 서버에서 처리
			myId = d.data?.myauction_id || "";
			myPw = d.data?.myauction_pw || "";
		} catch {
			// 무시
		}

		if (!myId) {
			setError("설정 페이지에서 마이옥션 아이디/비밀번호를 먼저 저장해주세요");
			setCrawling(false);
			return;
		}

		try {
			const res = await fetch("http://localhost:8787/api/crawl", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ myauction_id: myId, myauction_pw: myPw, user_id: user.id }),
			});
			const data = await res.json() as { data?: { count: number; items: { case_no: string; item_type: string; address: string }[] }; error?: string };
			if (data.error) {
				setError(data.error);
			} else if (data.data) {
				setResult(data.data);
				queryClient.invalidateQueries({ queryKey: ["items"] });
			}
		} catch {
			setError("크롤링 서버에 연결할 수 없습니다. 터미널에서 python crawler/server.py 를 실행해주세요.");
		}
		setCrawling(false);
	};

	return (
		<div className="bg-white rounded-lg shadow-sm p-4 mb-4">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h3 className="text-sm font-bold text-gray-800">마이옥션 관심물건</h3>
					<p className="text-xs text-gray-400">마이옥션에 등록한 관심물건을 가져옵니다</p>
				</div>
				<button onClick={handleCrawl} disabled={crawling}
					className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0">
					{crawling ? (
						<>
							<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
							가져오는 중...
						</>
					) : "관심물건 가져오기"}
				</button>
			</div>

			{error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-3">{error}</p>}

			{result && (
				<div className="mt-3 bg-green-50 rounded p-3">
					<p className="text-sm font-medium text-green-800">{result.count}건 가져오기 완료!</p>
					<div className="mt-1 space-y-0.5">
						{result.items.map((item, i) => (
							<p key={i} className="text-xs text-green-700">
								[{item.item_type}] {item.case_no} - {item.address.substring(0, 40)}
							</p>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function getDday(dateStr: string): number | null {
	try {
		const target = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		target.setHours(0, 0, 0, 0);
		return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	} catch {
		return null;
	}
}

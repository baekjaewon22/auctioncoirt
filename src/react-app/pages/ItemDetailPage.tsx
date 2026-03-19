import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { api, formatPriceRaw } from "../lib/api";

export default function ItemDetailPage() {
	const { caseNo } = useParams<{ caseNo: string }>();
	const [activeImg, setActiveImg] = useState(0);

	const { data, isLoading } = useQuery({
		queryKey: ["item", caseNo],
		queryFn: () => api.getItem(caseNo!),
		enabled: !!caseNo,
	});

	if (isLoading) return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
	const item = data?.data;
	if (!item) return <div className="text-center py-20 text-gray-400">물건을 찾을 수 없습니다</div>;

	const images: string[] = safeJsonParse(item.all_images, []);
	const documents: Record<string, { type: string; url: string }> = safeJsonParse(item.documents, {});

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<Link to="/search" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; 목록으로</Link>

			{/* 헤더: 법원/사건번호/물건종류 */}
			<div className="bg-blue-700 text-white rounded-t-lg px-6 py-3 flex items-center gap-3">
				<span className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold">{item.item_type ?? "기타"}</span>
				<span className="text-lg font-bold">{item.court_name} {item.case_no}</span>
			</div>

			{/* 주소 + 가격 요약 */}
			<div className="bg-white border-x px-6 py-4">
				<p className="text-base font-medium text-gray-900 mb-2">{item.address_full}</p>
				<div className="flex items-end gap-8">
					<div>
						<span className="text-xs text-gray-400">감정가</span>
						<p className="text-lg font-bold text-gray-900">{formatPriceRaw(item.appraisal_price)}</p>
					</div>
					<div>
						<span className="text-xs text-gray-400">최저매각가</span>
						<p className="text-lg font-bold text-blue-600">
							{item.bid_rate != null && <span className="text-pink-600 mr-1">&darr; {item.bid_rate}%</span>}
							{formatPriceRaw(item.min_bid_price)}
						</p>
					</div>
					{item.status && (
						<div>
							<span className="text-xs text-gray-400">상태</span>
							<p className="text-lg font-bold text-orange-600">{item.status}</p>
						</div>
					)}
				</div>
			</div>

			{/* 이미지 갤러리 */}
			{images.length > 0 && (
				<div className="bg-white border-x px-6 py-4">
					<div className="flex gap-4">
						<div className="flex-1">
							<img src={images[activeImg]} alt="물건사진" className="w-full h-64 object-contain bg-gray-50 rounded border" />
						</div>
						{images.length > 1 && (
							<div className="flex flex-col gap-1 overflow-y-auto max-h-64 w-20">
								{images.map((img, i) => (
									<img key={i} src={img} alt="" onClick={() => setActiveImg(i)}
										className={`w-20 h-14 object-cover rounded cursor-pointer border-2 ${i === activeImg ? "border-blue-500" : "border-transparent hover:border-gray-300"}`} />
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* 사건기본정보 */}
			<Section title="사건기본정보">
				<InfoTable rows={[
					["소재지", item.address_full],
					["경매종류", item.auction_type, "토지면적", item.land_area ? `${item.land_area}평` : "-"],
					["물건종류", item.item_type, "건물면적", item.building_area ? `${item.building_area}평` : "-"],
					["경매대상", item.auction_target, "입찰보증금", item.bid_deposit ? `(10%) ${item.bid_deposit.toLocaleString()}원` : "-"],
					["입찰방법", item.bid_method, "청구금액", formatPriceRaw(item.claim_amount)],
					["채무/소유자", item.debtor, "채권자", item.creditor],
					["관련사건", item.related_case],
					["매각기일", item.sale_date, "조회수", String(item.views ?? 0)],
				]} />
			</Section>

			{/* 감정평가현황 */}
			{item.appraisal_summary && (
				<Section title="감정평가현황">
					{item.appraiser && (
						<p className="text-xs text-gray-500 mb-2">[감정원 : {item.appraiser} / 가격시점 : {item.appraisal_date}]</p>
					)}
					<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded max-h-80 overflow-y-auto">
						{item.appraisal_summary}
					</pre>
				</Section>
			)}

			{/* 임차인현황 */}
			{item.tenant_info && item.tenant_info !== "null" && (
				<Section title="임차인현황">
					<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
						{safeJsonParse(item.tenant_info, item.tenant_info)}
					</pre>
				</Section>
			)}

			{/* 등기부현황 */}
			{item.registry_info && item.registry_info !== "null" && (
				<Section title="등기부현황">
					<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
						{typeof safeJsonParse(item.registry_info, "") === "string"
							? safeJsonParse(item.registry_info, "")
							: JSON.stringify(safeJsonParse(item.registry_info, ""), null, 2)}
					</pre>
				</Section>
			)}

			{/* 예상배당표 */}
			{item.expected_dividend && item.expected_dividend !== "null" && (
				<Section title="예상배당표">
					<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
						{typeof safeJsonParse(item.expected_dividend, "") === "string"
							? safeJsonParse(item.expected_dividend, "")
							: JSON.stringify(safeJsonParse(item.expected_dividend, ""), null, 2)}
					</pre>
				</Section>
			)}

			{/* 주의사항 */}
			{item.caution_notes && (
				<Section title="주의사항">
					<pre className="text-xs text-red-700 whitespace-pre-wrap leading-relaxed bg-red-50 p-3 rounded">
						{item.caution_notes}
					</pre>
				</Section>
			)}

			{/* 관련문서 */}
			{Object.keys(documents).length > 0 && (
				<Section title="관련문서">
					<div className="flex flex-wrap gap-2">
						{Object.entries(documents).map(([name, doc]) => (
							<a key={name} href={doc.url} target="_blank" rel="noreferrer"
								className="inline-flex items-center gap-1 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 text-xs px-3 py-1.5 rounded transition-colors">
								{name}
							</a>
						))}
					</div>
				</Section>
			)}

			{/* 원본 링크 */}
			{item.source_url && (
				<div className="mt-4 text-center">
					<a href={item.source_url} target="_blank" rel="noreferrer"
						className="text-xs text-gray-400 hover:text-blue-600">
						마이옥션 원본 보기 &rarr;
					</a>
				</div>
			)}
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="bg-white border-x border-b">
			<div className="bg-gray-50 border-t px-6 py-2">
				<h3 className="text-sm font-bold text-gray-700">{title}</h3>
			</div>
			<div className="px-6 py-4">{children}</div>
		</div>
	);
}

function InfoTable({ rows }: { rows: (string | number | null | undefined)[][] }) {
	return (
		<table className="w-full text-sm border-collapse">
			<tbody>
				{rows.map((row, i) => (
					<tr key={i} className="border-b border-gray-100">
						{row.length === 2 ? (
							<>
								<th className="text-left bg-gray-50 px-3 py-2 text-xs text-gray-500 font-medium w-28 whitespace-nowrap">{row[0]}</th>
								<td className="px-3 py-2 text-gray-900" colSpan={3}>{row[1] ?? "-"}</td>
							</>
						) : row.length === 4 ? (
							<>
								<th className="text-left bg-gray-50 px-3 py-2 text-xs text-gray-500 font-medium w-28 whitespace-nowrap">{row[0]}</th>
								<td className="px-3 py-2 text-gray-900">{row[1] ?? "-"}</td>
								<th className="text-left bg-gray-50 px-3 py-2 text-xs text-gray-500 font-medium w-28 whitespace-nowrap">{row[2]}</th>
								<td className="px-3 py-2 text-gray-900">{row[3] ?? "-"}</td>
							</>
						) : null}
					</tr>
				))}
			</tbody>
		</table>
	);
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
	if (!value || value === "null") return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return value as unknown as T;
	}
}

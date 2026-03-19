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

	const images: string[] = jp(item.all_images, []);
	const documents: Record<string, { type: string; url: string }> = jp(item.documents, {});

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<Link to="/search" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; 목록으로</Link>

			{/* 헤더 */}
			<div className="bg-blue-700 text-white rounded-t-lg px-6 py-3 flex items-center gap-3">
				<span className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold">{item.item_type ?? "기타"}</span>
				<span className="text-lg font-bold">{item.court_name} {item.case_no}</span>
			</div>

			{/* 주소 + 가격 */}
			<div className="bg-white border-x px-6 py-4">
				<p className="text-base font-medium text-gray-900 mb-3">{item.address_full}</p>
				<div className="flex items-end gap-8 flex-wrap">
					<PriceBox label="감정가" value={formatPriceRaw(item.appraisal_price)} />
					<PriceBox label="최저매각가" value={formatPriceRaw(item.min_bid_price)}
						prefix={item.bid_rate != null ? `↓ ${item.bid_rate}%` : undefined} color="blue" />
					{item.status && <PriceBox label="상태" value={item.status} color="orange" />}
				</div>
			</div>

			{/* 이미지 갤러리 */}
			{images.length > 0 && (
				<div className="bg-white border-x px-6 py-4">
					<div className="flex gap-4">
						<div className="flex-1 bg-gray-50 rounded border flex items-center justify-center min-h-[280px]">
							<img src={images[activeImg]} alt="물건사진" className="max-h-[280px] object-contain" />
						</div>
						{images.length > 1 && (
							<div className="flex flex-col gap-1 overflow-y-auto max-h-[280px] w-20 shrink-0">
								{images.map((img, i) => (
									<img key={i} src={img} alt="" onClick={() => setActiveImg(i)}
										className={`w-20 h-14 object-cover rounded cursor-pointer border-2 transition ${i === activeImg ? "border-blue-500" : "border-gray-200 hover:border-gray-400"}`} />
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* 사건기본정보 */}
			<Section title="사건기본정보">
				<KvTable rows={[
					[["소재지", item.address_full ?? "-"]],
					[["경매종류", item.auction_type], ["토지면적", pyeong(item.land_area)]],
					[["물건종류", item.item_type], ["건물면적", pyeong(item.building_area)]],
					[["경매대상", item.auction_target], ["입찰보증금", item.bid_deposit ? `(10%) ${item.bid_deposit.toLocaleString()}원` : "-"]],
					[["입찰방법", item.bid_method], ["청구금액", formatPriceRaw(item.claim_amount)]],
					[["채무/소유자", item.debtor], ["채권자", item.creditor]],
					[["관련사건", item.related_case]],
					[["매각기일", item.sale_date], ["조회수", String(item.views ?? 0)]],
				]} />
			</Section>

			{/* 감정평가현황 */}
			<TextSection title="감정평가현황" content={item.appraisal_summary}
				subtitle={item.appraiser ? `[감정원 : ${item.appraiser} / 가격시점 : ${item.appraisal_date}]` : undefined} />

			{/* 국토부 실거래가 */}
			<TabDelimitedSection title="국토부 실거래가" content={item.real_trade_info} />

			{/* 임차인현황 */}
			<TabDelimitedSection title="임차인현황" content={item.tenant_info} />

			{/* 등기부현황 */}
			<TabDelimitedSection title="등기부현황" content={item.registry_info} />

			{/* 예상배당표 */}
			<TabDelimitedSection title="예상배당표" content={item.expected_dividend} />

			{/* 주의사항 */}
			{item.caution_notes && (
				<Section title="주의사항">
					<pre className="text-xs text-red-800 whitespace-pre-wrap leading-relaxed bg-red-50 p-4 rounded">{item.caution_notes}</pre>
				</Section>
			)}

			{/* 관련문서 */}
			{Object.keys(documents).length > 0 && (
				<Section title="관련문서">
					<div className="flex flex-wrap gap-2">
						{Object.entries(documents).map(([name, doc]) => (
							<a key={name} href={doc.url} target="_blank" rel="noreferrer"
								className="inline-flex items-center bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 text-gray-700 hover:text-blue-700 text-sm px-4 py-2 rounded transition-colors">
								{name}
							</a>
						))}
					</div>
				</Section>
			)}

			{/* 원본 링크 */}
			{item.source_url && (
				<div className="bg-white border-x border-b rounded-b-lg py-4 text-center">
					<a href={item.source_url} target="_blank" rel="noreferrer" className="text-sm text-gray-400 hover:text-blue-600">
						마이옥션 원본 보기 &rarr;
					</a>
				</div>
			)}
		</div>
	);
}

/* ===== 컴포넌트 ===== */

function PriceBox({ label, value, prefix, color }: { label: string; value: string; prefix?: string; color?: string }) {
	const textColor = color === "blue" ? "text-blue-600" : color === "orange" ? "text-orange-600" : "text-gray-900";
	return (
		<div>
			<span className="text-xs text-gray-400">{label}</span>
			<p className={`text-lg font-bold ${textColor}`}>
				{prefix && <span className="text-pink-600 mr-1 text-sm">{prefix}</span>}
				{value}
			</p>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="bg-white border-x border-b">
			<div className="border-t px-6 py-2.5 bg-gray-50">
				<h3 className="text-sm font-bold text-gray-800">{title}</h3>
			</div>
			<div className="px-6 py-4">{children}</div>
		</div>
	);
}

function KvTable({ rows }: { rows: [string, string | number | null | undefined][][] }) {
	return (
		<table className="w-full text-sm border border-gray-200">
			<tbody>
				{rows.map((row, i) => (
					<tr key={i} className="border-b border-gray-100">
						{row.length === 1 ? (
							<>
								<th className="text-left bg-gray-50 px-3 py-2.5 text-xs text-gray-500 font-medium w-28 border-r border-gray-200 whitespace-nowrap align-top">{row[0][0]}</th>
								<td className="px-3 py-2.5 text-gray-800" colSpan={3}>{row[0][1] ?? "-"}</td>
							</>
						) : (
							<>
								<th className="text-left bg-gray-50 px-3 py-2.5 text-xs text-gray-500 font-medium w-28 border-r border-gray-200 whitespace-nowrap align-top">{row[0][0]}</th>
								<td className="px-3 py-2.5 text-gray-800 border-r border-gray-100">{row[0][1] ?? "-"}</td>
								<th className="text-left bg-gray-50 px-3 py-2.5 text-xs text-gray-500 font-medium w-28 border-r border-gray-200 whitespace-nowrap align-top">{row[1][0]}</th>
								<td className="px-3 py-2.5 text-gray-800">{row[1][1] ?? "-"}</td>
							</>
						)}
					</tr>
				))}
			</tbody>
		</table>
	);
}

function TextSection({ title, content, subtitle }: { title: string; content?: string | null; subtitle?: string }) {
	if (!content) return null;
	return (
		<Section title={title}>
			{subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
			<div className="bg-gray-50 border rounded p-4 max-h-80 overflow-y-auto">
				<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{content}</pre>
			</div>
		</Section>
	);
}

function TabDelimitedSection({ title, content }: { title: string; content?: string | null }) {
	if (!content || content === "null" || content.length < 10) return null;

	// 탭으로 구분된 텍스트를 테이블로 변환
	const lines = content.split("\n").filter((l) => l.trim());
	const titleLine = lines[0]; // 섹션 제목 줄
	const subtitle = lines.length > 1 && lines[1].startsWith("[") ? lines[1] : undefined;

	// 테이블 데이터 추출 (탭 구분 행)
	const tableLines = lines.filter((l) => l.includes("\t"));
	const textLines = lines.filter((l) => !l.includes("\t") && l !== titleLine && l !== subtitle);

	return (
		<Section title={title}>
			{subtitle && <p className="text-xs text-blue-700 mb-3 font-medium">{subtitle}</p>}

			{tableLines.length > 0 && (
				<div className="overflow-x-auto mb-3">
					<table className="w-full text-xs border border-gray-200">
						<tbody>
							{tableLines.map((line, i) => {
								const cells = line.split("\t").map((c) => c.trim());
								const isHeader = i === 0 && cells.every((c) => c.length < 15);
								return (
									<tr key={i} className={`border-b border-gray-100 ${isHeader ? "bg-gray-50 font-medium" : ""}`}>
										{cells.map((cell, j) => {
											const Tag = isHeader ? "th" : "td";
											return (
												<Tag key={j} className={`px-2 py-1.5 text-left ${j === 0 ? "bg-gray-50 font-medium text-gray-600 whitespace-nowrap" : "text-gray-800"} border-r border-gray-100 last:border-r-0`}>
													{cell || "-"}
												</Tag>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{textLines.length > 0 && (
				<div className="bg-gray-50 rounded p-3 mt-2">
					<pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
						{textLines.join("\n")}
					</pre>
				</div>
			)}
		</Section>
	);
}

/* ===== 유틸 ===== */

function jp<T>(value: string | null | undefined, fallback: T): T {
	if (!value || value === "null") return fallback;
	try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
}

function pyeong(v?: number | null): string {
	if (!v) return "-";
	return `${v}평`;
}

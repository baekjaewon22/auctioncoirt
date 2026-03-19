import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ItemDetailPage() {
	const { caseNo } = useParams<{ caseNo: string }>();

	const { data: itemData, isLoading } = useQuery({
		queryKey: ["item", caseNo],
		queryFn: () => api.getItem(caseNo!),
		enabled: !!caseNo,
	});

	const { data: historyData } = useQuery({
		queryKey: ["history", caseNo],
		queryFn: () => api.getHistory(caseNo!),
		enabled: !!caseNo,
	});

	const formatPrice = (price?: number) => {
		if (!price) return "-";
		return `${price.toLocaleString()}원`;
	};

	if (isLoading) {
		return (
			<div className="text-center py-12 text-gray-400">로딩 중...</div>
		);
	}

	const item = itemData?.data;
	if (!item) {
		return (
			<div className="text-center py-12 text-gray-400">
				물건을 찾을 수 없습니다
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<Link
				to="/search"
				className="text-sm text-blue-600 hover:underline mb-4 inline-block"
			>
				&larr; 목록으로
			</Link>

			{/* 기본 정보 */}
			<div className="bg-white rounded-lg shadow-sm p-6 mb-4">
				<div className="flex justify-between items-start mb-4">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
								{item.item_type ?? "기타"}
							</span>
							<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
								{item.status ?? "진행중"}
							</span>
						</div>
						<h2 className="text-lg font-bold text-gray-900">
							{item.address_full ?? "-"}
						</h2>
						<p className="text-sm text-gray-500 mt-1">
							{item.case_no} (물건 {item.item_no}) | {item.court_name}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p className="text-xs text-gray-400">감정가</p>
						<p className="text-base font-bold">
							{formatPrice(item.appraisal_price)}
						</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">최저매각가</p>
						<p className="text-base font-bold text-blue-600">
							{formatPrice(item.min_bid_price)}
						</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">매각기일</p>
						<p className="text-base font-medium">
							{item.sale_date ?? "-"} {item.sale_time ?? ""}
						</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">유찰횟수</p>
						<p className="text-base font-medium">
							{item.fail_count ?? 0}회
						</p>
					</div>
				</div>
			</div>

			{/* 건물/토지 정보 */}
			<div className="bg-white rounded-lg shadow-sm p-6 mb-4">
				<h3 className="text-sm font-bold text-gray-700 mb-3">
					건물/토지 내역
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
					<div>
						<p className="text-xs text-gray-400">건물면적</p>
						<p>{item.building_area ? `${item.building_area}㎡` : "-"}</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">토지면적</p>
						<p>{item.land_area ? `${item.land_area}㎡` : "-"}</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">층수</p>
						<p>{item.floor_info ?? "-"}</p>
					</div>
					<div className="col-span-2 md:col-span-3">
						<p className="text-xs text-gray-400">건물내역</p>
						<p>{item.item_detail ?? "-"}</p>
					</div>
				</div>
			</div>

			{/* 매각기일 히스토리 */}
			{historyData && historyData.data.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm p-6 mb-4">
					<h3 className="text-sm font-bold text-gray-700 mb-3">
						매각기일 히스토리
					</h3>
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs text-gray-400 border-b">
								<th className="pb-2">기일</th>
								<th className="pb-2">최저가</th>
								<th className="pb-2">결과</th>
								<th className="pb-2">낙찰가</th>
								<th className="pb-2">응찰수</th>
							</tr>
						</thead>
						<tbody>
							{historyData.data.map((h) => (
								<tr key={h.id} className="border-b last:border-b-0">
									<td className="py-2">{h.sale_date ?? "-"}</td>
									<td className="py-2">{formatPrice(h.min_bid_price)}</td>
									<td className="py-2">{h.result ?? "-"}</td>
									<td className="py-2">{formatPrice(h.winning_price)}</td>
									<td className="py-2">{h.bidder_count ?? "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* 문서 다운로드 */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h3 className="text-sm font-bold text-gray-700 mb-3">관련 문서</h3>
				<div className="flex gap-3">
					{item.appraisal_pdf_url && (
						<a
							href={item.appraisal_pdf_url}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-blue-600 hover:underline"
						>
							감정평가서
						</a>
					)}
					{item.survey_pdf_url && (
						<a
							href={item.survey_pdf_url}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-blue-600 hover:underline"
						>
							현황조사서
						</a>
					)}
					{item.spec_pdf_url && (
						<a
							href={item.spec_pdf_url}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-blue-600 hover:underline"
						>
							매각물건명세서
						</a>
					)}
					{!item.appraisal_pdf_url &&
						!item.survey_pdf_url &&
						!item.spec_pdf_url && (
							<p className="text-sm text-gray-400">등록된 문서가 없습니다</p>
						)}
				</div>
			</div>
		</div>
	);
}

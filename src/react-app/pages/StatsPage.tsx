import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function StatsPage() {
	const { data: regionData, isLoading: regionLoading } = useQuery({
		queryKey: ["stats-region"],
		queryFn: () => api.getRegionStats(),
	});

	const { data: typeData, isLoading: typeLoading } = useQuery({
		queryKey: ["stats-type"],
		queryFn: () => api.getTypeStats(),
	});

	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<h2 className="text-xl font-bold text-gray-900 mb-6">경매 통계</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* 지역별 통계 */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-sm font-bold text-gray-700 mb-4">
						지역별 경매 현황
					</h3>
					{regionLoading ? (
						<p className="text-sm text-gray-400">로딩 중...</p>
					) : !regionData || regionData.data.length === 0 ? (
						<p className="text-sm text-gray-400">데이터가 없습니다</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs text-gray-400 border-b">
									<th className="pb-2">지역</th>
									<th className="pb-2 text-right">건수</th>
									<th className="pb-2 text-right">평균 낙찰가율</th>
								</tr>
							</thead>
							<tbody>
								{regionData.data.map((r) => (
									<tr key={r.sido} className="border-b last:border-b-0">
										<td className="py-2">{r.sido}</td>
										<td className="py-2 text-right">
											{r.count.toLocaleString()}
										</td>
										<td className="py-2 text-right">
											{r.avg_winning_rate
												? `${r.avg_winning_rate.toFixed(1)}%`
												: "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				{/* 용도별 통계 */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-sm font-bold text-gray-700 mb-4">
						물건종류별 현황
					</h3>
					{typeLoading ? (
						<p className="text-sm text-gray-400">로딩 중...</p>
					) : !typeData || typeData.data.length === 0 ? (
						<p className="text-sm text-gray-400">데이터가 없습니다</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs text-gray-400 border-b">
									<th className="pb-2">종류</th>
									<th className="pb-2 text-right">건수</th>
								</tr>
							</thead>
							<tbody>
								{typeData.data.map((t) => (
									<tr
										key={t.item_type}
										className="border-b last:border-b-0"
									>
										<td className="py-2">{t.item_type}</td>
										<td className="py-2 text-right">
											{t.count.toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
}

import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function HomePage() {
	const navigate = useNavigate();
	const [sido, setSido] = useState("");
	const [itemType, setItemType] = useState("");

	const handleSearch = () => {
		const params = new URLSearchParams();
		if (sido) params.set("sido", sido);
		if (itemType) params.set("type", itemType);
		navigate(`/search?${params.toString()}`);
	};

	return (
		<>
			{/* Hero */}
			<section className="mx-auto max-w-7xl px-4 py-12">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						법원경매 물건을 한눈에
					</h2>
					<p className="text-gray-500 mb-8">
						대법원 경매정보를 기반으로 전국 경매 물건을 검색하세요
					</p>
				</div>

				{/* Quick Search */}
				<div className="mx-auto max-w-3xl bg-white rounded-xl shadow-md p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<select
							className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
							value={sido}
							onChange={(e) => setSido(e.target.value)}
						>
							<option value="">시/도 선택</option>
							<option>서울</option>
							<option>경기</option>
							<option>인천</option>
							<option>부산</option>
							<option>대구</option>
							<option>대전</option>
							<option>광주</option>
							<option>울산</option>
							<option>세종</option>
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
							value={itemType}
							onChange={(e) => setItemType(e.target.value)}
						>
							<option value="">물건종류</option>
							<option>아파트</option>
							<option>빌라/연립</option>
							<option>오피스텔</option>
							<option>단독/다가구</option>
							<option>상가</option>
							<option>토지</option>
						</select>
						<button
							onClick={handleSearch}
							className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
						>
							검색
						</button>
					</div>
				</div>
			</section>

			{/* Stats Summary */}
			<section className="mx-auto max-w-7xl px-4 py-8">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						{ label: "금주 경매 예정", value: "-", unit: "건" },
						{ label: "신건 등록", value: "-", unit: "건" },
						{ label: "평균 낙찰가율", value: "-", unit: "%" },
						{ label: "전체 등록 물건", value: "-", unit: "건" },
					].map((stat) => (
						<div
							key={stat.label}
							className="bg-white rounded-lg shadow-sm p-4 text-center"
						>
							<p className="text-2xl font-bold text-blue-600">
								{stat.value}
								<span className="text-sm text-gray-400 ml-1">
									{stat.unit}
								</span>
							</p>
							<p className="text-xs text-gray-500 mt-1">{stat.label}</p>
						</div>
					))}
				</div>
			</section>
		</>
	);
}

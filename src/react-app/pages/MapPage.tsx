import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useKakaoMap } from "../hooks/useKakaoMap";

export default function MapPage() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const { isReady, addMarkers } = useKakaoMap(mapContainerRef);

	const sido = searchParams.get("sido") ?? undefined;
	const type = searchParams.get("type") ?? undefined;

	const { data } = useQuery({
		queryKey: ["map-items", sido, type],
		queryFn: () =>
			api.getItems({
				sido,
				type,
				limit: "100",
			}),
	});

	useEffect(() => {
		if (isReady && data?.data) {
			addMarkers(data.data);
		}
	}, [isReady, data]);

	const setFilter = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		setSearchParams(params);
	};

	return (
		<div className="flex flex-col h-[calc(100vh-64px)]">
			{/* 필터 바 */}
			<div className="bg-white border-b px-4 py-2 flex gap-3 items-center">
				<select
					className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
					value={sido ?? ""}
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
					className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
					value={type ?? ""}
					onChange={(e) => setFilter("type", e.target.value)}
				>
					<option value="">물건종류 전체</option>
					<option>아파트</option>
					<option>빌라/연립</option>
					<option>오피스텔</option>
					<option>상가</option>
					<option>토지</option>
				</select>
				{data && (
					<span className="text-xs text-gray-400">
						{data.pagination.total.toLocaleString()}건
					</span>
				)}
			</div>

			{/* 지도 영역 */}
			<div ref={mapContainerRef} className="flex-1 w-full" />

			{/* Kakao Map 미로드 시 안내 */}
			{typeof kakao === "undefined" && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
					<p className="text-gray-400 text-sm">
						Kakao Map API 키를 설정해주세요 (index.html)
					</p>
				</div>
			)}
		</div>
	);
}

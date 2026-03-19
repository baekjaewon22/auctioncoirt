import { useEffect, useRef, useState } from "react";
import type { AuctionItem } from "../lib/api";

interface UseKakaoMapOptions {
	center?: { lat: number; lng: number };
	level?: number;
}

export function useKakaoMap(
	containerRef: React.RefObject<HTMLDivElement | null>,
	options: UseKakaoMapOptions = {},
) {
	const { center = { lat: 37.5665, lng: 126.978 }, level = 8 } = options;
	const mapRef = useRef<kakao.maps.Map | null>(null);
	const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!containerRef.current || typeof kakao === "undefined") return;

		const map = new kakao.maps.Map(containerRef.current, {
			center: new kakao.maps.LatLng(center.lat, center.lng),
			level,
		});

		const clusterer = new kakao.maps.MarkerClusterer({
			map,
			averageCenter: true,
			minLevel: 5,
			gridSize: 60,
		});

		mapRef.current = map;
		clustererRef.current = clusterer;
		setIsReady(true);

		return () => {
			clusterer.clear();
		};
	}, [containerRef]);

	const addMarkers = (items: AuctionItem[]) => {
		if (!mapRef.current || !clustererRef.current) return;

		clustererRef.current.clear();

		const markers: kakao.maps.Marker[] = [];
		const bounds = new kakao.maps.LatLngBounds();

		for (const item of items) {
			if (!item.latitude || !item.longitude) continue;

			const position = new kakao.maps.LatLng(
				item.latitude,
				item.longitude,
			);
			const marker = new kakao.maps.Marker({ position });

			const infoContent = `
				<div style="padding:8px;font-size:12px;max-width:250px;">
					<strong>${item.item_type ?? ""}</strong>
					<p style="margin:4px 0;color:#666;">${item.address_full ?? ""}</p>
					<p style="margin:2px 0;">감정가: ${formatPrice(item.appraisal_price)}</p>
					<p style="margin:2px 0;color:#2563eb;font-weight:bold;">최저가: ${formatPrice(item.min_bid_price)}</p>
					<a href="/items/${encodeURIComponent(item.case_no)}" style="color:#2563eb;font-size:11px;">상세보기</a>
				</div>
			`;

			const infoWindow = new kakao.maps.InfoWindow({
				content: infoContent,
				removable: true,
			});

			kakao.maps.event.addListener(marker, "click", () => {
				infoWindow.open(mapRef.current!, marker);
			});

			markers.push(marker);
			bounds.extend(position);
		}

		clustererRef.current.addMarkers(markers);

		if (markers.length > 0) {
			mapRef.current.setBounds(bounds);
		}
	};

	return { map: mapRef.current, isReady, addMarkers };
}

function formatPrice(price?: number): string {
	if (!price) return "-";
	if (price >= 100000000) return `${(price / 100000000).toFixed(1)}억`;
	if (price >= 10000) return `${(price / 10000).toFixed(0)}만`;
	return price.toLocaleString();
}

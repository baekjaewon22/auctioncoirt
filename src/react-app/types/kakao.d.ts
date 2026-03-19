/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace kakao.maps {
	class Map {
		constructor(container: HTMLElement, options: MapOptions);
		setCenter(latlng: LatLng): void;
		setLevel(level: number): void;
		getCenter(): LatLng;
		getLevel(): number;
		setBounds(bounds: LatLngBounds): void;
	}

	interface MapOptions {
		center: LatLng;
		level?: number;
	}

	class LatLng {
		constructor(lat: number, lng: number);
		getLat(): number;
		getLng(): number;
	}

	class LatLngBounds {
		constructor();
		extend(latlng: LatLng): void;
	}

	class Marker {
		constructor(options: MarkerOptions);
		setMap(map: Map | null): void;
		getPosition(): LatLng;
	}

	interface MarkerOptions {
		position: LatLng;
		map?: Map;
	}

	class InfoWindow {
		constructor(options: InfoWindowOptions);
		open(map: Map, marker: Marker): void;
		close(): void;
	}

	interface InfoWindowOptions {
		content: string;
		removable?: boolean;
	}

	class MarkerClusterer {
		constructor(options: MarkerClustererOptions);
		addMarkers(markers: Marker[]): void;
		clear(): void;
	}

	interface MarkerClustererOptions {
		map: Map;
		averageCenter?: boolean;
		minLevel?: number;
		gridSize?: number;
	}

	namespace event {
		function addListener(
			target: any,
			type: string,
			callback: (...args: any[]) => void,
		): void;
	}

	namespace services {
		class Geocoder {
			addressSearch(
				address: string,
				callback: (result: any[], status: string) => void,
			): void;
		}

		const Status: {
			OK: string;
		};
	}
}

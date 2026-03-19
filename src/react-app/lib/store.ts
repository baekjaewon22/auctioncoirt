import { create } from "zustand";
import type { SearchParams } from "./api";

interface SearchStore {
	filters: SearchParams;
	setFilter: (key: keyof SearchParams, value: string) => void;
	setFilters: (filters: Partial<SearchParams>) => void;
	resetFilters: () => void;
}

const defaultFilters: SearchParams = {
	page: "1",
	limit: "20",
	sort: "sale_date",
	order: "asc",
};

export const useSearchStore = create<SearchStore>((set) => ({
	filters: { ...defaultFilters },
	setFilter: (key, value) =>
		set((state) => ({
			filters: { ...state.filters, [key]: value, page: "1" },
		})),
	setFilters: (filters) =>
		set((state) => ({
			filters: { ...state.filters, ...filters, page: "1" },
		})),
	resetFilters: () => set({ filters: { ...defaultFilters } }),
}));

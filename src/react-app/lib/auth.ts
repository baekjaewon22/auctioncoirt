import { create } from "zustand";

interface AuthState {
	user: { id: number; email: string; name: string } | null;
	token: string | null;
	login: (email: string, password: string) => Promise<boolean>;
	register: (email: string, password: string, name: string) => Promise<string | null>;
	logout: () => void;
	loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
	user: null,
	token: null,

	login: async (email, password) => {
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		const data = await res.json() as { data?: { user: { id: number; email: string; name: string }; token: string }; error?: string };
		if (data.data) {
			localStorage.setItem("auth_token", data.data.token);
			localStorage.setItem("auth_user", JSON.stringify(data.data.user));
			set({ user: data.data.user, token: data.data.token });
			return true;
		}
		return false;
	},

	register: async (email, password, name) => {
		const res = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, name }),
		});
		const data = await res.json() as { data?: unknown; error?: string };
		if (data.error) return data.error;
		return null;
	},

	logout: () => {
		localStorage.removeItem("auth_token");
		localStorage.removeItem("auth_user");
		set({ user: null, token: null });
	},

	loadFromStorage: () => {
		const token = localStorage.getItem("auth_token");
		const userStr = localStorage.getItem("auth_user");
		if (token && userStr) {
			try {
				const user = JSON.parse(userStr);
				set({ user, token });
			} catch {
				localStorage.removeItem("auth_token");
				localStorage.removeItem("auth_user");
			}
		}
	},
}));

export function authHeaders(): Record<string, string> {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

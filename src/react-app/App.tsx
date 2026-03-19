import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import StatsPage from "./pages/StatsPage";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import BlogPage from "./pages/BlogPage";
import "./App.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	},
});

function AppInit({ children }: { children: React.ReactNode }) {
	const { loadFromStorage } = useAuth();
	useEffect(() => { loadFromStorage(); }, []);
	return <>{children}</>;
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AppInit>
					<Routes>
						<Route element={<Layout />}>
							<Route path="/" element={<HomePage />} />
							<Route path="/search" element={<SearchPage />} />
							<Route path="/items/:caseNo" element={<ItemDetailPage />} />
							<Route path="/map" element={<MapPage />} />
							<Route path="/stats" element={<StatsPage />} />
							<Route path="/login" element={<LoginPage />} />
							<Route path="/settings" element={<SettingsPage />} />
							<Route path="/blog" element={<BlogPage />} />
						</Route>
					</Routes>
				</AppInit>
			</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;

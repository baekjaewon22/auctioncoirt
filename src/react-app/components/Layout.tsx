import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Layout() {
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const { user, logout } = useAuth();

	const navLinks = [
		{ to: "/", label: "홈" },
		{ to: "/search", label: "물건검색" },
		{ to: "/blog", label: "블로그 자동화", auth: true },
		{ to: "/settings", label: "설정", auth: true },
	];

	const visibleLinks = navLinks.filter((l) => !l.auth || user);

	const isActive = (path: string) =>
		location.pathname === path
			? "text-blue-600 font-medium"
			: "text-gray-600 hover:text-blue-600";

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm sticky top-0 z-50">
				<div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
					<Link to="/" className="text-lg font-bold text-blue-700">
						법원경매 정보
					</Link>

					{/* Desktop nav */}
					<div className="hidden md:flex items-center gap-4 text-sm">
						{visibleLinks.map((link) => (
							<Link key={link.to} to={link.to} className={isActive(link.to)}>
								{link.label}
							</Link>
						))}
						{user ? (
							<div className="flex items-center gap-2 ml-2 pl-2 border-l">
								<span className="text-xs text-gray-400">{user.name || user.email}</span>
								<button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">
									로그아웃
								</button>
							</div>
						) : (
							<Link to="/login" className="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">
								로그인
							</Link>
						)}
					</div>

					{/* Mobile hamburger */}
					<button className="md:hidden p-1 text-gray-600" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							{menuOpen ? (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							) : (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
							)}
						</svg>
					</button>
				</div>

				{menuOpen && (
					<nav className="md:hidden border-t px-4 py-2 bg-white">
						{visibleLinks.map((link) => (
							<Link key={link.to} to={link.to} className={`block py-2 text-sm ${isActive(link.to)}`}
								onClick={() => setMenuOpen(false)}>
								{link.label}
							</Link>
						))}
						{user ? (
							<button onClick={() => { logout(); setMenuOpen(false); }}
								className="block py-2 text-sm text-red-500">로그아웃</button>
						) : (
							<Link to="/login" className="block py-2 text-sm text-blue-600"
								onClick={() => setMenuOpen(false)}>로그인</Link>
						)}
					</nav>
				)}
			</header>

			<Outlet />

			<footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
				Court Auction Information Service &copy; 2026
			</footer>
		</div>
	);
}

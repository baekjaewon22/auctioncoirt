import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);

	const navLinks = [
		{ to: "/", label: "홈" },
		{ to: "/search", label: "물건검색" },
		{ to: "/map", label: "지도검색" },
		{ to: "/stats", label: "통계" },
	];

	const isActive = (path: string) =>
		location.pathname === path
			? "text-blue-600 font-medium"
			: "text-gray-600 hover:text-blue-600";

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm sticky top-0 z-50">
				<div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
					<Link to="/" className="text-lg font-bold text-blue-700">
						법원경매 정보
					</Link>

					{/* Desktop nav */}
					<nav className="hidden md:flex gap-4 text-sm">
						{navLinks.map((link) => (
							<Link key={link.to} to={link.to} className={isActive(link.to)}>
								{link.label}
							</Link>
						))}
					</nav>

					{/* Mobile hamburger */}
					<button
						className="md:hidden p-1 text-gray-600"
						onClick={() => setMenuOpen(!menuOpen)}
						aria-label="메뉴"
					>
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							{menuOpen ? (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							) : (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
							)}
						</svg>
					</button>
				</div>

				{/* Mobile menu */}
				{menuOpen && (
					<nav className="md:hidden border-t px-4 py-2 bg-white">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className={`block py-2 text-sm ${isActive(link.to)}`}
								onClick={() => setMenuOpen(false)}
							>
								{link.label}
							</Link>
						))}
					</nav>
				)}
			</header>

			{/* Content */}
			<Outlet />

			{/* Footer */}
			<footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
				Court Auction Information Service &copy; 2026
			</footer>
		</div>
	);
}

import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
	const location = useLocation();

	const navLinks = [
		{ to: "/", label: "홈" },
		{ to: "/search", label: "물건검색" },
		{ to: "/stats", label: "통계" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm">
				<div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
					<Link to="/" className="text-xl font-bold text-blue-700">
						법원경매 정보
					</Link>
					<nav className="flex gap-4 text-sm">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className={
									location.pathname === link.to
										? "text-blue-600 font-medium"
										: "text-gray-600 hover:text-blue-600"
								}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
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

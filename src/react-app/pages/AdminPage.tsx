import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, authHeaders } from "../lib/auth";
import { useNavigate } from "react-router-dom";

interface User {
	id: number;
	email: string;
	name: string;
	role: string;
	created_at: string;
}

export default function AdminPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	if (!user) { navigate("/login"); return null; }

	const { data, isLoading } = useQuery({
		queryKey: ["admin-users"],
		queryFn: async () => {
			const res = await fetch("/api/auth/admin/users", { headers: authHeaders() });
			return res.json() as Promise<{ data?: User[]; error?: string }>;
		},
	});

	const [msg, setMsg] = useState("");

	const handleApprove = async (userId: number) => {
		const res = await fetch("/api/auth/admin/approve", {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ userId }),
		});
		const d = await res.json() as { data?: { message: string }; error?: string };
		setMsg(d.data?.message || d.error || "");
		queryClient.invalidateQueries({ queryKey: ["admin-users"] });
	};

	const handleResetPassword = async (userId: number, email: string) => {
		const newPw = prompt(`${email}의 새 비밀번호 입력 (빈칸이면 1234):`, "1234");
		if (newPw === null) return;

		const res = await fetch("/api/auth/admin/reset-password", {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ userId, newPassword: newPw || "1234" }),
		});
		const d = await res.json() as { data?: { message: string }; error?: string };
		setMsg(d.data?.message || d.error || "");
	};

	const handleDelete = async (userId: number, email: string) => {
		if (!confirm(`${email} 회원을 삭제하시겠습니까?`)) return;

		const res = await fetch("/api/auth/admin/delete-user", {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ userId }),
		});
		const d = await res.json() as { data?: { message: string }; error?: string };
		setMsg(d.data?.message || d.error || "");
		queryClient.invalidateQueries({ queryKey: ["admin-users"] });
	};

	if (data?.error) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12 text-center">
				<p className="text-red-600 text-sm">{data.error}</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl px-4 py-6">
			<h2 className="text-xl font-bold text-gray-900 mb-2">관리자</h2>
			<p className="text-sm text-gray-400 mb-6">회원 관리 및 승인</p>

			{msg && (
				<div className="bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded mb-4">
					{msg}
					<button onClick={() => setMsg("")} className="ml-2 text-blue-400 hover:text-blue-600">x</button>
				</div>
			)}

			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 border-b">
						<tr>
							<th className="px-4 py-2 text-left">ID</th>
							<th className="px-4 py-2 text-left">아이디</th>
							<th className="px-4 py-2 text-left">이름</th>
							<th className="px-4 py-2 text-center">상태</th>
							<th className="px-4 py-2 text-left">가입일</th>
							<th className="px-4 py-2 text-center">관리</th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">로딩 중...</td></tr>
						)}
						{data?.data?.map((u) => (
							<tr key={u.id} className="border-b hover:bg-gray-50">
								<td className="px-4 py-2 text-gray-400">{u.id}</td>
								<td className="px-4 py-2 font-medium">{u.email}</td>
								<td className="px-4 py-2">{u.name || "-"}</td>
								<td className="px-4 py-2 text-center">
									<RoleBadge role={u.role} />
								</td>
								<td className="px-4 py-2 text-xs text-gray-400">{u.created_at?.slice(0, 10)}</td>
								<td className="px-4 py-2 text-center">
									<div className="flex justify-center gap-1">
										{u.role === "pending" && (
											<button onClick={() => handleApprove(u.id)}
												className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
												승인
											</button>
										)}
										<button onClick={() => handleResetPassword(u.id, u.email)}
											className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
											비번초기화
										</button>
										{u.role !== "admin" && (
											<button onClick={() => handleDelete(u.id, u.email)}
												className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
												삭제
											</button>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function RoleBadge({ role }: { role: string }) {
	const styles: Record<string, string> = {
		admin: "bg-purple-100 text-purple-700",
		user: "bg-green-100 text-green-700",
		pending: "bg-yellow-100 text-yellow-700",
	};
	const labels: Record<string, string> = {
		admin: "관리자",
		user: "일반회원",
		pending: "승인대기",
	};
	return (
		<span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${styles[role] || "bg-gray-100 text-gray-600"}`}>
			{labels[role] || role}
		</span>
	);
}

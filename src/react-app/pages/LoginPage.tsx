import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [name, setName] = useState("");
	const { login, register } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (isRegister) {
			const err = await register(email, password, name);
			if (err) {
				setError(err);
			} else {
				const ok = await login(email, password);
				if (ok) navigate("/settings");
			}
		} else {
			const ok = await login(email, password);
			if (ok) {
				navigate("/search");
			} else {
				setError("아이디 또는 비밀번호가 올바르지 않습니다");
			}
		}
	};

	return (
		<div className="flex items-center justify-center min-h-[70vh]">
			<div className="w-full max-w-sm">
				<h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
					{isRegister ? "회원가입" : "로그인"}
				</h2>

				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
					{isRegister && (
						<div>
							<label className="block text-xs text-gray-500 mb-1">이름</label>
							<input type="text" value={name} onChange={(e) => setName(e.target.value)}
								className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="홍길동" />
						</div>
					)}
					<div>
						<label className="block text-xs text-gray-500 mb-1">아이디</label>
						<input type="text" value={email} onChange={(e) => setEmail(e.target.value)}
							className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="아이디 입력" required />
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">비밀번호</label>
						<input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
							className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="비밀번호" required />
					</div>

					{error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

					<button type="submit"
						className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
						{isRegister ? "가입하기" : "로그인"}
					</button>

					<p className="text-xs text-center text-gray-400">
						{isRegister ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
						<button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }}
							className="text-blue-600 hover:underline">
							{isRegister ? "로그인" : "회원가입"}
						</button>
					</p>
				</form>
			</div>
		</div>
	);
}

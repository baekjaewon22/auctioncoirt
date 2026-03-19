import { useState, useEffect } from "react";
import { useAuth, authHeaders } from "../lib/auth";
import { useNavigate } from "react-router-dom";

interface Settings {
	myauction_id: string;
	myauction_pw: string;
	ai_api_key: string;
	ai_provider: string;
	ai_prompt: string;
	naver_client_id: string;
	naver_client_secret: string;
	naver_access_token: string;
	tistory_app_id: string;
	tistory_secret_key: string;
	tistory_access_token: string;
	tistory_blog_name: string;
	[key: string]: string;
}

const DEFAULT_PROMPT = `블로그에 최적화된 말투로 전문가 수준으로 경매 물건 분석 게시글을 작성해줘.

규칙:
1. 제목은 SEO 최적화 (지역명 + 물건종류 + 핵심 키워드)
2. 본문 2000자 이상, HTML 형식
3. 물건 기본정보, 감정평가 분석, 투자 포인트, 주의사항 포함
4. 전문가 분석 + 읽기 쉬운 문체
5. JSON 응답: {"title": "제목", "content": "<html>본문</html>"}`;

export default function SettingsPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [settings, setSettings] = useState<Settings>({
		myauction_id: "", myauction_pw: "",
		ai_api_key: "", ai_provider: "claude", ai_prompt: DEFAULT_PROMPT,
		naver_client_id: "", naver_client_secret: "", naver_access_token: "",
		tistory_app_id: "", tistory_secret_key: "", tistory_access_token: "", tistory_blog_name: "",
	});
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState("");

	useEffect(() => {
		if (!user) { navigate("/login"); return; }
		fetch("/api/settings", { headers: authHeaders() })
			.then((r) => r.json())
			.then((d: { data?: Record<string, string> }) => {
				if (d.data) setSettings((prev) => ({ ...prev, ...d.data }));
			});
	}, [user]);

	const handleSave = async () => {
		setSaving(true);
		setMsg("");
		const res = await fetch("/api/settings", {
			method: "PUT",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify(settings),
		});
		const data = await res.json() as { data?: { saved: number } };
		setMsg(`${data.data?.saved ?? 0}개 설정이 저장되었습니다`);
		setSaving(false);
	};

	const set = (key: string, value: string) =>
		setSettings((prev) => ({ ...prev, [key]: value }));

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h2 className="text-xl font-bold text-gray-900 mb-6">설정</h2>

			{/* 마이옥션 계정 + 크롤링 */}
			<Section title="마이옥션 계정" desc="관심물건 크롤링에 사용됩니다">
				<InputRow label="아이디" value={settings.myauction_id} onChange={(v) => set("myauction_id", v)} placeholder="마이옥션 아이디" />
				<InputRow label="비밀번호" value={settings.myauction_pw} onChange={(v) => set("myauction_pw", v)} placeholder="마이옥션 비밀번호" type="password" />
				<CrawlButton myauctionId={settings.myauction_id} myauctionPw={settings.myauction_pw} />
			</Section>

			{/* AI 설정 */}
			<Section title="AI API 설정" desc="블로그 글 자동 생성에 사용됩니다">
				<div className="mb-3">
					<label className="block text-xs text-gray-500 mb-1">AI 제공자</label>
					<select value={settings.ai_provider} onChange={(e) => set("ai_provider", e.target.value)}
						className="w-full border rounded-lg px-3 py-2 text-sm">
						<option value="claude">Claude (Anthropic)</option>
						<option value="openai">OpenAI (GPT-4)</option>
					</select>
				</div>
				<InputRow label="API 키" value={settings.ai_api_key} onChange={(v) => set("ai_api_key", v)}
					placeholder={settings.ai_provider === "claude" ? "sk-ant-..." : "sk-..."} type="password" />
				<div className="mb-3">
					<label className="block text-xs text-gray-500 mb-1">AI 프롬프트 (글 작성 지시문)</label>
					<textarea value={settings.ai_prompt} onChange={(e) => set("ai_prompt", e.target.value)}
						className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-y" placeholder="블로그 글 작성 지시문을 입력하세요" />
				</div>
			</Section>

			{/* 네이버 블로그 */}
			<Section title="네이버 블로그 API" desc="네이버 블로그 자동 발행에 사용됩니다">
				<InputRow label="Client ID" value={settings.naver_client_id} onChange={(v) => set("naver_client_id", v)} />
				<InputRow label="Client Secret" value={settings.naver_client_secret} onChange={(v) => set("naver_client_secret", v)} type="password" />
				<InputRow label="Access Token" value={settings.naver_access_token} onChange={(v) => set("naver_access_token", v)} type="password" />
			</Section>

			{/* 티스토리 */}
			<Section title="티스토리 API" desc="티스토리 자동 발행에 사용됩니다">
				<InputRow label="App ID" value={settings.tistory_app_id} onChange={(v) => set("tistory_app_id", v)} />
				<InputRow label="Secret Key" value={settings.tistory_secret_key} onChange={(v) => set("tistory_secret_key", v)} type="password" />
				<InputRow label="Access Token" value={settings.tistory_access_token} onChange={(v) => set("tistory_access_token", v)} type="password" />
				<InputRow label="블로그명" value={settings.tistory_blog_name} onChange={(v) => set("tistory_blog_name", v)} placeholder="myblog" />
			</Section>

			{/* 저장 */}
			<div className="flex items-center gap-4 mt-6">
				<button onClick={handleSave} disabled={saving}
					className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
					{saving ? "저장 중..." : "설정 저장"}
				</button>
				{msg && <span className="text-sm text-green-600">{msg}</span>}
			</div>

			{/* 비밀번호 변경 */}
			<PasswordChangeSection />
		</div>
	);
}

function PasswordChangeSection() {
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [pwMsg, setPwMsg] = useState("");
	const [pwError, setPwError] = useState("");

	const handleChangePw = async () => {
		setPwMsg("");
		setPwError("");
		if (newPw !== confirmPw) { setPwError("새 비밀번호가 일치하지 않습니다"); return; }
		if (newPw.length < 4) { setPwError("비밀번호는 4자 이상이어야 합니다"); return; }

		const res = await fetch("/api/auth/change-password", {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
		});
		const data = await res.json() as { data?: { message: string }; error?: string };
		if (data.error) { setPwError(data.error); }
		else { setPwMsg(data.data?.message || "변경 완료"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
	};

	return (
		<div className="bg-white rounded-lg shadow-sm p-5 mt-6">
			<h3 className="text-sm font-bold text-gray-800 mb-0.5">비밀번호 변경</h3>
			<p className="text-xs text-gray-400 mb-4">현재 비밀번호를 입력해야 변경할 수 있습니다</p>
			<InputRow label="현재 비밀번호" value={currentPw} onChange={setCurrentPw} type="password" placeholder="현재 비밀번호" />
			<InputRow label="새 비밀번호" value={newPw} onChange={setNewPw} type="password" placeholder="새 비밀번호 (4자 이상)" />
			<InputRow label="비밀번호 확인" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="새 비밀번호 확인" />
			{pwError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">{pwError}</p>}
			{pwMsg && <p className="text-xs text-green-600 bg-green-50 p-2 rounded mb-3">{pwMsg}</p>}
			<button onClick={handleChangePw}
				className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
				비밀번호 변경
			</button>
		</div>
	);
}

function CrawlButton({ myauctionId, myauctionPw }: { myauctionId: string; myauctionPw: string }) {
	const { user } = useAuth();
	const [crawling, setCrawling] = useState(false);
	const [result, setResult] = useState<{ count: number; items: { case_no: string; item_type: string; address: string }[] } | null>(null);
	const [error, setError] = useState("");

	const handleCrawl = async () => {
		if (!myauctionId || !myauctionPw) {
			setError("마이옥션 아이디/비밀번호를 먼저 입력하고 설정을 저장해주세요");
			return;
		}
		setCrawling(true);
		setError("");
		setResult(null);

		try {
			const res = await fetch("http://localhost:8787/api/crawl", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					myauction_id: myauctionId,
					myauction_pw: myauctionPw,
					user_id: user?.id ?? 0,
				}),
			});
			const data = await res.json() as { data?: { count: number; items: { case_no: string; item_type: string; address: string }[] }; error?: string };
			if (data.error) {
				setError(data.error);
			} else if (data.data) {
				setResult(data.data);
			}
		} catch {
			setError("크롤링 서버에 연결할 수 없습니다. 터미널에서 'python crawler/server.py' 를 실행해주세요.");
		}
		setCrawling(false);
	};

	return (
		<div className="mt-4 pt-4 border-t">
			<div className="flex items-center gap-3">
				<button onClick={handleCrawl} disabled={crawling}
					className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2">
					{crawling ? (
						<>
							<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
							크롤링 중...
						</>
					) : "마이옥션 관심물건 가져오기"}
				</button>
				{crawling && <span className="text-xs text-gray-400">물건 수에 따라 1~3분 소요됩니다</span>}
			</div>

			{error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-3">{error}</p>}

			{result && (
				<div className="mt-3 bg-green-50 rounded p-3">
					<p className="text-sm font-medium text-green-800 mb-2">{result.count}건 가져오기 완료!</p>
					<div className="space-y-1">
						{result.items.map((item, i) => (
							<p key={i} className="text-xs text-green-700">
								<span className="font-medium">[{item.item_type}]</span> {item.case_no} - {item.address.substring(0, 40)}
							</p>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
	return (
		<div className="bg-white rounded-lg shadow-sm p-5 mb-4">
			<h3 className="text-sm font-bold text-gray-800 mb-0.5">{title}</h3>
			<p className="text-xs text-gray-400 mb-4">{desc}</p>
			{children}
		</div>
	);
}

function InputRow({ label, value, onChange, placeholder, type }: {
	label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
	return (
		<div className="mb-3">
			<label className="block text-xs text-gray-500 mb-1">{label}</label>
			<input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)}
				className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={placeholder || label} />
		</div>
	);
}

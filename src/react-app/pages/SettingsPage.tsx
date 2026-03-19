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

			{/* 마이옥션 계정 */}
			<Section title="마이옥션 계정" desc="관심물건 크롤링에 사용됩니다">
				<InputRow label="아이디" value={settings.myauction_id} onChange={(v) => set("myauction_id", v)} placeholder="마이옥션 아이디" />
				<InputRow label="비밀번호" value={settings.myauction_pw} onChange={(v) => set("myauction_pw", v)} placeholder="마이옥션 비밀번호" type="password" />
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

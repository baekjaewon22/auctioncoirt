import { Hono } from "hono";
import type { AppEnv } from "../index";
import { getUserFromHeader } from "./auth";

export const settings = new Hono<AppEnv>();

// 설정 키 목록
const VALID_KEYS = [
	"myauction_id",       // 마이옥션 아이디
	"myauction_pw",       // 마이옥션 비밀번호
	"ai_api_key",         // AI API 키 (Claude/OpenAI)
	"ai_provider",        // AI 제공자 (claude, openai)
	"ai_prompt",          // 블로그 글 생성 프롬프트
	"naver_client_id",    // 네이버 블로그 API
	"naver_client_secret",
	"naver_access_token",
	"tistory_app_id",     // 티스토리 API
	"tistory_secret_key",
	"tistory_access_token",
	"tistory_blog_name",
];

// 전체 설정 조회
settings.get("/", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const rows = await db
		.prepare("SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?")
		.bind(user.userId)
		.all<{ setting_key: string; setting_value: string }>();

	// 비밀번호/키는 마스킹
	const masked: Record<string, string> = {};
	for (const row of rows.results) {
		const key = row.setting_key;
		const val = row.setting_value;
		if (key.includes("pw") || key.includes("secret") || key.includes("api_key") || key.includes("token")) {
			masked[key] = val ? "●".repeat(Math.min(val.length, 8)) : "";
		} else {
			masked[key] = val;
		}
	}

	return c.json({ data: masked });
});

// 설정 저장 (일괄)
settings.put("/", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const body = await c.req.json<Record<string, string>>();
	const db = c.env.DB;

	let saved = 0;
	for (const [key, value] of Object.entries(body)) {
		if (!VALID_KEYS.includes(key)) continue;

		await db
			.prepare(
				"INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?) ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = ?",
			)
			.bind(user.userId, key, value, value)
			.run();
		saved++;
	}

	return c.json({ data: { saved } });
});

// 개별 설정 조회 (내부용)
export async function getSetting(
	db: D1Database,
	userId: number,
	key: string,
): Promise<string | null> {
	const row = await db
		.prepare(
			"SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
		)
		.bind(userId, key)
		.first<{ setting_value: string }>();
	return row?.setting_value ?? null;
}

import { Hono } from "hono";
import type { AppEnv } from "../index";
import { getUserFromHeader } from "./auth";
import { getSetting } from "./settings";

export const blog = new Hono<AppEnv>();

// AI로 블로그 글 생성
blog.post("/generate", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const { itemId } = await c.req.json<{ itemId: number }>();
	const db = c.env.DB;

	// 물건 정보 조회
	const item = await db
		.prepare("SELECT * FROM auction_items WHERE id = ? AND user_id = ?")
		.bind(itemId, user.userId)
		.first();

	if (!item) return c.json({ error: "물건을 찾을 수 없습니다" }, 404);

	// 사용자 설정 조회
	const apiKey = await getSetting(db, user.userId, "ai_api_key");
	const provider = (await getSetting(db, user.userId, "ai_provider")) || "claude";
	const customPrompt = await getSetting(db, user.userId, "ai_prompt");

	if (!apiKey) {
		return c.json({ error: "AI API 키를 설정해주세요" }, 400);
	}

	// 물건 정보를 텍스트로 변환
	const itemInfo = buildItemContext(item);

	// AI에게 블로그 글 생성 요청
	const systemPrompt = customPrompt || DEFAULT_PROMPT;
	const userMessage = `다음 경매 물건 정보를 바탕으로 블로그 글을 작성해주세요:\n\n${itemInfo}`;

	try {
		let result: { title: string; content: string };

		if (provider === "claude") {
			result = await callClaude(apiKey, systemPrompt, userMessage);
		} else {
			result = await callOpenAI(apiKey, systemPrompt, userMessage);
		}

		// 발행 이력 저장 (draft)
		const insertResult = await db
			.prepare(
				"INSERT INTO blog_posts (user_id, auction_item_id, platform, post_title, post_content, status, ai_prompt) VALUES (?, ?, 'draft', ?, ?, 'draft', ?)",
			)
			.bind(user.userId, itemId, result.title, result.content, systemPrompt)
			.run();

		return c.json({
			data: {
				postId: insertResult.meta.last_row_id,
				title: result.title,
				content: result.content,
			},
		});
	} catch (e) {
		return c.json({ error: `AI 생성 실패: ${e}` }, 500);
	}
});

// 네이버 블로그 발행
blog.post("/publish/naver", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const { postId } = await c.req.json<{ postId: number }>();
	const db = c.env.DB;

	const post = await db
		.prepare("SELECT * FROM blog_posts WHERE id = ? AND user_id = ?")
		.bind(postId, user.userId)
		.first<{ id: number; post_title: string; post_content: string }>();

	if (!post) return c.json({ error: "글을 찾을 수 없습니다" }, 404);

	const accessToken = await getSetting(db, user.userId, "naver_access_token");
	if (!accessToken) return c.json({ error: "네이버 API 토큰을 설정해주세요" }, 400);

	try {
		const res = await fetch("https://openapi.naver.com/blog/writePost.json", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				title: post.post_title,
				contents: post.post_content,
			}).toString(),
		});

		const data = await res.json() as Record<string, unknown>;

		if (res.ok) {
			await db
				.prepare("UPDATE blog_posts SET platform = 'naver', status = 'published', post_url = ? WHERE id = ?")
				.bind(String(data.url || ""), postId)
				.run();
			return c.json({ data: { url: data.url, status: "published" } });
		}
		return c.json({ error: `네이버 발행 실패: ${JSON.stringify(data)}` }, 500);
	} catch (e) {
		return c.json({ error: `네이버 발행 오류: ${e}` }, 500);
	}
});

// 티스토리 발행
blog.post("/publish/tistory", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const { postId } = await c.req.json<{ postId: number }>();
	const db = c.env.DB;

	const post = await db
		.prepare("SELECT * FROM blog_posts WHERE id = ? AND user_id = ?")
		.bind(postId, user.userId)
		.first<{ id: number; post_title: string; post_content: string }>();

	if (!post) return c.json({ error: "글을 찾을 수 없습니다" }, 404);

	const accessToken = await getSetting(db, user.userId, "tistory_access_token");
	const blogName = await getSetting(db, user.userId, "tistory_blog_name");
	if (!accessToken || !blogName) {
		return c.json({ error: "티스토리 API 설정을 완료해주세요" }, 400);
	}

	try {
		const res = await fetch("https://www.tistory.com/apis/post/write", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				access_token: accessToken,
				output: "json",
				blogName,
				title: post.post_title,
				content: post.post_content,
				visibility: "3", // 발행
			}).toString(),
		});

		const data = await res.json() as Record<string, unknown>;

		if (res.ok) {
			const postUrl = (data as { tistory?: { url?: string } }).tistory?.url || "";
			await db
				.prepare("UPDATE blog_posts SET platform = 'tistory', status = 'published', post_url = ? WHERE id = ?")
				.bind(postUrl, postId)
				.run();
			return c.json({ data: { url: postUrl, status: "published" } });
		}
		return c.json({ error: `티스토리 발행 실패: ${JSON.stringify(data)}` }, 500);
	} catch (e) {
		return c.json({ error: `티스토리 발행 오류: ${e}` }, 500);
	}
});

// 발행 이력 조회
blog.get("/posts", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const rows = await db
		.prepare(
			"SELECT bp.*, ai.case_no, ai.item_type, ai.address_full FROM blog_posts bp LEFT JOIN auction_items ai ON bp.auction_item_id = ai.id WHERE bp.user_id = ? ORDER BY bp.created_at DESC LIMIT 50",
		)
		.bind(user.userId)
		.all();

	return c.json({ data: rows.results });
});

// ===== 유틸 =====

function buildItemContext(item: Record<string, unknown>): string {
	return `
사건번호: ${item.case_no}
법원: ${item.court_id}
물건종류: ${item.item_type}
소재지: ${item.address_full}
감정가: ${item.appraisal_price ? Number(item.appraisal_price).toLocaleString() : '-'}원
최저매각가: ${item.min_bid_price ? Number(item.min_bid_price).toLocaleString() : '-'}원
매각가율: ${item.bid_rate}%
매각기일: ${item.sale_date}
상태: ${item.status}
토지면적: ${item.land_area}평
건물면적: ${item.building_area}평
경매종류: ${item.auction_type}
경매대상: ${item.auction_target}
특수권리: ${item.special_rights || '없음'}
감정평가: ${String(item.appraisal_summary || '').substring(0, 1000)}
임차인현황: ${String(item.tenant_info || '').substring(0, 500)}
`.trim();
}

const DEFAULT_PROMPT = `당신은 부동산 경매 전문 블로거입니다.
주어진 경매 물건 정보를 바탕으로 블로그 글을 작성해주세요.

규칙:
1. 제목은 SEO에 최적화되게 작성 (지역명 + 물건종류 + 핵심 정보)
2. 본문은 2000자 이상, HTML 형식으로 작성
3. 물건 기본정보, 감정평가 분석, 투자 포인트, 주의사항을 포함
4. 전문가 수준의 분석을 제공하되 읽기 쉽게 작성
5. 응답은 JSON 형식: {"title": "제목", "content": "<html>본문</html>"}`;

async function callClaude(
	apiKey: string,
	systemPrompt: string,
	userMessage: string,
): Promise<{ title: string; content: string }> {
	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model: "claude-sonnet-4-20250514",
			max_tokens: 4096,
			system: systemPrompt,
			messages: [{ role: "user", content: userMessage }],
		}),
	});

	const data = await res.json() as { content?: { text?: string }[] };
	const text = data.content?.[0]?.text || "";

	// JSON 파싱 시도
	try {
		const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
	} catch {
		// JSON 파싱 실패 시 텍스트 그대로 사용
	}

	return {
		title: text.substring(0, 100),
		content: text,
	};
}

async function callOpenAI(
	apiKey: string,
	systemPrompt: string,
	userMessage: string,
): Promise<{ title: string; content: string }> {
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "gpt-4o",
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userMessage },
			],
			max_tokens: 4096,
		}),
	});

	const data = await res.json() as { choices?: { message?: { content?: string } }[] };
	const text = data.choices?.[0]?.message?.content || "";

	try {
		const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
		if (jsonMatch) return JSON.parse(jsonMatch[0]);
	} catch {
		// fallback
	}

	return { title: text.substring(0, 100), content: text };
}

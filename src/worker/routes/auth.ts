import { Hono } from "hono";
import type { AppEnv } from "../index";

export const auth = new Hono<AppEnv>();

// 간단한 해시 (실서비스에서는 bcrypt 등 사용)
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + "auctioncourt_salt_2026");
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// 회원가입
auth.post("/register", async (c) => {
	const { email, password, name } = await c.req.json<{
		email: string;
		password: string;
		name: string;
	}>();

	if (!email || !password) {
		return c.json({ error: "이메일과 비밀번호를 입력해주세요" }, 400);
	}

	const db = c.env.DB;
	const existing = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first();

	if (existing) {
		return c.json({ error: "이미 가입된 이메일입니다" }, 409);
	}

	const passwordHash = await hashPassword(password);
	const result = await db
		.prepare(
			"INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
		)
		.bind(email, passwordHash, name || "")
		.run();

	return c.json({
		data: {
			id: result.meta.last_row_id,
			email,
			name,
		},
	});
});

// 로그인
auth.post("/login", async (c) => {
	const { email, password } = await c.req.json<{
		email: string;
		password: string;
	}>();

	const db = c.env.DB;
	const passwordHash = await hashPassword(password);

	const user = await db
		.prepare(
			"SELECT id, email, name FROM users WHERE email = ? AND password_hash = ?",
		)
		.bind(email, passwordHash)
		.first<{ id: number; email: string; name: string }>();

	if (!user) {
		return c.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" }, 401);
	}

	// 간단한 토큰 (실서비스에서는 JWT 사용)
	const token = btoa(
		JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 86400000 }),
	);

	return c.json({ data: { user, token } });
});

// 현재 사용자 정보
auth.get("/me", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const userData = await db
		.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
		.bind(user.userId)
		.first();

	return c.json({ data: userData });
});

// 토큰에서 사용자 정보 추출
export function getUserFromHeader(c: { req: { header: (name: string) => string | undefined } }): {
	userId: number;
	email: string;
} | null {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;

	try {
		const token = authHeader.slice(7);
		const payload = JSON.parse(atob(token));
		if (payload.exp < Date.now()) return null;
		return { userId: payload.userId, email: payload.email };
	} catch {
		return null;
	}
}

import { Hono } from "hono";
import type { AppEnv } from "../index";

export const auth = new Hono<AppEnv>();

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + "auctioncourt_salt_2026");
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// 회원가입 (기본 role = pending, 관리자 승인 필요)
auth.post("/register", async (c) => {
	const { email, password, name } = await c.req.json<{
		email: string;
		password: string;
		name: string;
	}>();

	if (!email || !password) {
		return c.json({ error: "아이디와 비밀번호를 입력해주세요" }, 400);
	}

	const db = c.env.DB;
	const existing = await db
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first();

	if (existing) {
		return c.json({ error: "이미 가입된 아이디입니다" }, 409);
	}

	const passwordHash = await hashPassword(password);
	const result = await db
		.prepare(
			"INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'pending')",
		)
		.bind(email, passwordHash, name || "")
		.run();

	return c.json({
		data: {
			id: result.meta.last_row_id,
			email,
			name,
			message: "가입 완료. 관리자 승인 후 사용 가능합니다.",
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
			"SELECT id, email, name, role FROM users WHERE email = ? AND password_hash = ?",
		)
		.bind(email, passwordHash)
		.first<{ id: number; email: string; name: string; role: string }>();

	if (!user) {
		return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, 401);
	}

	if (user.role === "pending") {
		return c.json({ error: "관리자 승인 대기 중입니다. 승인 후 로그인 가능합니다." }, 403);
	}

	const token = btoa(
		JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 }),
	);

	return c.json({ data: { user, token } });
});

// 현재 사용자 정보
auth.get("/me", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const userData = await db
		.prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
		.bind(user.userId)
		.first();

	return c.json({ data: userData });
});

// 비밀번호 변경
auth.post("/change-password", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const { currentPassword, newPassword } = await c.req.json<{
		currentPassword: string;
		newPassword: string;
	}>();

	if (!newPassword || newPassword.length < 4) {
		return c.json({ error: "새 비밀번호는 4자 이상이어야 합니다" }, 400);
	}

	const db = c.env.DB;
	const currentHash = await hashPassword(currentPassword);

	const existing = await db
		.prepare("SELECT id FROM users WHERE id = ? AND password_hash = ?")
		.bind(user.userId, currentHash)
		.first();

	if (!existing) {
		return c.json({ error: "현재 비밀번호가 올바르지 않습니다" }, 401);
	}

	const newHash = await hashPassword(newPassword);
	await db
		.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(newHash, user.userId)
		.run();

	return c.json({ data: { message: "비밀번호가 변경되었습니다" } });
});

// ===== 관리자 전용 API =====

// 전체 회원 목록
auth.get("/admin/users", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const admin = await db
		.prepare("SELECT role FROM users WHERE id = ?")
		.bind(user.userId)
		.first<{ role: string }>();

	if (admin?.role !== "admin") {
		return c.json({ error: "관리자 권한이 필요합니다" }, 403);
	}

	const rows = await db
		.prepare("SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC")
		.all();

	return c.json({ data: rows.results });
});

// 회원 승인
auth.post("/admin/approve", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const admin = await db
		.prepare("SELECT role FROM users WHERE id = ?")
		.bind(user.userId)
		.first<{ role: string }>();

	if (admin?.role !== "admin") {
		return c.json({ error: "관리자 권한이 필요합니다" }, 403);
	}

	const { userId } = await c.req.json<{ userId: number }>();
	await db
		.prepare("UPDATE users SET role = 'user', updated_at = datetime('now') WHERE id = ?")
		.bind(userId)
		.run();

	return c.json({ data: { message: "승인 완료" } });
});

// 회원 비밀번호 초기화 (관리자)
auth.post("/admin/reset-password", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const admin = await db
		.prepare("SELECT role FROM users WHERE id = ?")
		.bind(user.userId)
		.first<{ role: string }>();

	if (admin?.role !== "admin") {
		return c.json({ error: "관리자 권한이 필요합니다" }, 403);
	}

	const { userId, newPassword } = await c.req.json<{
		userId: number;
		newPassword: string;
	}>();

	const newHash = await hashPassword(newPassword || "1234");
	await db
		.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(newHash, userId)
		.run();

	return c.json({ data: { message: `비밀번호가 초기화되었습니다 (${newPassword || "1234"})` } });
});

// 회원 삭제 (관리자)
auth.post("/admin/delete-user", async (c) => {
	const user = getUserFromHeader(c);
	if (!user) return c.json({ error: "로그인이 필요합니다" }, 401);

	const db = c.env.DB;
	const admin = await db
		.prepare("SELECT role FROM users WHERE id = ?")
		.bind(user.userId)
		.first<{ role: string }>();

	if (admin?.role !== "admin") {
		return c.json({ error: "관리자 권한이 필요합니다" }, 403);
	}

	const { userId } = await c.req.json<{ userId: number }>();

	if (userId === user.userId) {
		return c.json({ error: "자기 자신은 삭제할 수 없습니다" }, 400);
	}

	await db.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId).run();
	await db.prepare("DELETE FROM blog_posts WHERE user_id = ?").bind(userId).run();
	await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

	return c.json({ data: { message: "회원이 삭제되었습니다" } });
});

// 토큰에서 사용자 정보 추출
export function getUserFromHeader(c: { req: { header: (name: string) => string | undefined } }): {
	userId: number;
	email: string;
	role?: string;
} | null {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;

	try {
		const token = authHeader.slice(7);
		const payload = JSON.parse(atob(token));
		if (payload.exp < Date.now()) return null;
		return { userId: payload.userId, email: payload.email, role: payload.role };
	} catch {
		return null;
	}
}

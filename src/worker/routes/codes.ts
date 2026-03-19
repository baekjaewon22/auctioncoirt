import { Hono } from "hono";
import type { AppEnv } from "../index";

export const codes = new Hono<AppEnv>();

// 법원 목록
codes.get("/courts", async (c) => {
	const db = c.env.DB;
	const rows = await db
		.prepare("SELECT * FROM courts ORDER BY court_name")
		.all();

	return c.json({ data: rows.results });
});

// 지역 목록 (시도)
codes.get("/regions", async (c) => {
	const db = c.env.DB;
	const { sido } = c.req.query();

	if (sido) {
		// 시군구 목록
		const rows = await db
			.prepare(
				`SELECT DISTINCT sigu_code, sigu_name
         FROM region_codes
         WHERE sido_name = ?
         ORDER BY sigu_name`,
			)
			.bind(sido)
			.all();
		return c.json({ data: rows.results });
	}

	// 시도 목록
	const rows = await db
		.prepare(
			`SELECT DISTINCT sido_code, sido_name
       FROM region_codes
       ORDER BY sido_name`,
		)
		.all();

	return c.json({ data: rows.results });
});

// 물건종류 목록
codes.get("/types", async (c) => {
	const db = c.env.DB;
	const rows = await db
		.prepare(
			`SELECT DISTINCT item_type, COUNT(*) as count
       FROM auction_items
       WHERE item_type IS NOT NULL
       GROUP BY item_type
       ORDER BY count DESC`,
		)
		.all();

	return c.json({ data: rows.results });
});

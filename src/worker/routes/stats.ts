import { Hono } from "hono";
import type { AppEnv } from "../index";

export const stats = new Hono<AppEnv>();

// 지역별 통계
stats.get("/region", async (c) => {
	const db = c.env.DB;
	const rows = await db
		.prepare(
			`SELECT sido, COUNT(*) as count,
        AVG(winning_rate) as avg_winning_rate,
        AVG(appraisal_price) as avg_appraisal_price
       FROM auction_items
       WHERE sido IS NOT NULL
       GROUP BY sido
       ORDER BY count DESC`,
		)
		.all();

	return c.json({ data: rows.results });
});

// 용도별 통계
stats.get("/type", async (c) => {
	const db = c.env.DB;
	const rows = await db
		.prepare(
			`SELECT item_type, COUNT(*) as count,
        AVG(winning_rate) as avg_winning_rate
       FROM auction_items
       WHERE item_type IS NOT NULL
       GROUP BY item_type
       ORDER BY count DESC`,
		)
		.all();

	return c.json({ data: rows.results });
});

// 법원별 통계
stats.get("/court", async (c) => {
	const db = c.env.DB;
	const rows = await db
		.prepare(
			`SELECT c.court_name, COUNT(*) as count,
        AVG(a.winning_rate) as avg_winning_rate
       FROM auction_items a
       JOIN courts c ON a.court_id = c.id
       GROUP BY c.court_name
       ORDER BY count DESC`,
		)
		.all();

	return c.json({ data: rows.results });
});

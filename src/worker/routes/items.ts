import { Hono } from "hono";
import type { AppEnv } from "../index";

export const items = new Hono<AppEnv>();

// 물건 목록 (필터 + 페이지네이션)
items.get("/", async (c) => {
	const db = c.env.DB;
	const {
		sido,
		sigu,
		dong,
		type,
		court,
		priceMin,
		priceMax,
		bidMin,
		bidMax,
		dateFrom,
		dateTo,
		status,
		failCount,
		sort = "sale_date",
		order = "asc",
		page = "1",
		limit = "20",
	} = c.req.query();

	const conditions: string[] = [];
	const params: unknown[] = [];

	if (sido) {
		conditions.push("a.sido = ?");
		params.push(sido);
	}
	if (sigu) {
		conditions.push("a.sigu = ?");
		params.push(sigu);
	}
	if (dong) {
		conditions.push("a.dong = ?");
		params.push(dong);
	}
	if (type) {
		conditions.push("a.item_type = ?");
		params.push(type);
	}
	if (court) {
		conditions.push("c.court_name = ?");
		params.push(court);
	}
	if (priceMin) {
		conditions.push("a.appraisal_price >= ?");
		params.push(Number(priceMin));
	}
	if (priceMax) {
		conditions.push("a.appraisal_price <= ?");
		params.push(Number(priceMax));
	}
	if (bidMin) {
		conditions.push("a.min_bid_price >= ?");
		params.push(Number(bidMin));
	}
	if (bidMax) {
		conditions.push("a.min_bid_price <= ?");
		params.push(Number(bidMax));
	}
	if (dateFrom) {
		conditions.push("a.sale_date >= ?");
		params.push(dateFrom);
	}
	if (dateTo) {
		conditions.push("a.sale_date <= ?");
		params.push(dateTo);
	}
	if (status) {
		conditions.push("a.status = ?");
		params.push(status);
	}
	if (failCount) {
		conditions.push("a.fail_count >= ?");
		params.push(Number(failCount));
	}

	const allowedSorts = [
		"sale_date",
		"appraisal_price",
		"min_bid_price",
		"created_at",
	];
	const sortCol = allowedSorts.includes(sort) ? sort : "sale_date";
	const sortDir = order === "desc" ? "DESC" : "ASC";

	const pageNum = Math.max(1, Number(page));
	const limitNum = Math.min(100, Math.max(1, Number(limit)));
	const offset = (pageNum - 1) * limitNum;

	const where =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	const countResult = await db
		.prepare(
			`SELECT COUNT(*) as total FROM auction_items a LEFT JOIN courts c ON a.court_id = c.id ${where}`,
		)
		.bind(...params)
		.first<{ total: number }>();

	const rows = await db
		.prepare(
			`SELECT a.*, c.court_name, c.court_code
       FROM auction_items a
       LEFT JOIN courts c ON a.court_id = c.id
       ${where}
       ORDER BY a.${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
		)
		.bind(...params, limitNum, offset)
		.all();

	return c.json({
		data: rows.results,
		pagination: {
			page: pageNum,
			limit: limitNum,
			total: countResult?.total ?? 0,
			totalPages: Math.ceil((countResult?.total ?? 0) / limitNum),
		},
	});
});

// 물건 상세
items.get("/:caseNo", async (c) => {
	const db = c.env.DB;
	const caseNo = decodeURIComponent(c.req.param("caseNo"));

	const item = await db
		.prepare(
			`SELECT a.*, c.court_name, c.court_code
       FROM auction_items a
       LEFT JOIN courts c ON a.court_id = c.id
       WHERE a.case_no = ?`,
		)
		.bind(caseNo)
		.first();

	if (!item) {
		return c.json({ error: "물건을 찾을 수 없습니다" }, 404);
	}

	return c.json({ data: item });
});

// 매각기일 히스토리
items.get("/:caseNo/history", async (c) => {
	const db = c.env.DB;
	const caseNo = decodeURIComponent(c.req.param("caseNo"));

	const rows = await db
		.prepare(
			`SELECT sh.* FROM sale_history sh
       JOIN auction_items a ON sh.auction_item_id = a.id
       WHERE a.case_no = ?
       ORDER BY sh.sale_date DESC`,
		)
		.bind(caseNo)
		.all();

	return c.json({ data: rows.results });
});

// 임차인 현황
items.get("/:caseNo/tenants", async (c) => {
	const db = c.env.DB;
	const caseNo = decodeURIComponent(c.req.param("caseNo"));

	const rows = await db
		.prepare(
			`SELECT t.* FROM tenants t
       JOIN auction_items a ON t.auction_item_id = a.id
       WHERE a.case_no = ?`,
		)
		.bind(caseNo)
		.all();

	return c.json({ data: rows.results });
});

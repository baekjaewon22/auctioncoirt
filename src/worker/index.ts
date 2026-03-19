import { Hono } from "hono";
import { cors } from "hono/cors";
import { items } from "./routes/items";
import { stats } from "./routes/stats";
import { codes } from "./routes/codes";

export type AppEnv = {
	Bindings: {
		DB: D1Database;
	};
};

const app = new Hono<AppEnv>();

app.use("/api/*", cors());

// API Routes
app.route("/api/items", items);
app.route("/api/stats", stats);
app.route("/api/codes", codes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;

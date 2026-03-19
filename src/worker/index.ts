import { Hono } from "hono";
import { cors } from "hono/cors";
import { items } from "./routes/items";
import { stats } from "./routes/stats";
import { codes } from "./routes/codes";
import { auth } from "./routes/auth";
import { settings } from "./routes/settings";
import { blog } from "./routes/blog";

export type AppEnv = {
	Bindings: {
		DB: D1Database;
	};
};

const app = new Hono<AppEnv>();

app.use("/api/*", cors());

// API Routes
app.route("/api/auth", auth);
app.route("/api/settings", settings);
app.route("/api/blog", blog);
app.route("/api/items", items);
app.route("/api/stats", stats);
app.route("/api/codes", codes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;

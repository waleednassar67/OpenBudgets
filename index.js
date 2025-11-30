var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  budgetExpenditures: () => budgetExpenditures,
  insertBudgetExpenditureSchema: () => insertBudgetExpenditureSchema,
  insertUserSchema: () => insertUserSchema,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var budgetExpenditures = pgTable("budget_expenditures", {
  id: serial("id").primaryKey(),
  gl: text("gl").notNull(),
  department: text("department").notNull(),
  description: text("description").notNull(),
  activity_2022: numeric("activity_2022"),
  activity_2023: numeric("activity_2023"),
  budget_2024_amended: numeric("budget_2024_amended"),
  activity_2024_projected: numeric("activity_2024_projected"),
  budget_2025_adopted: numeric("budget_2025_adopted"),
  budget_amt_change: numeric("budget_amt_change"),
  budget_pct_change: numeric("budget_pct_change")
});
var insertBudgetExpenditureSchema = createInsertSchema(budgetExpenditures).omit({
  id: true
});

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import { sql as sql2 } from "drizzle-orm";
async function registerRoutes(app2) {
  app2.get("/api/budget/summary", async (_req, res) => {
    try {
      const result = await db.select({
        department: budgetExpenditures.department,
        total_budget_2024: sql2`COALESCE(SUM(${budgetExpenditures.budget_2024_amended})::float8, 0)`.as("total_budget_2024"),
        total_budget_2025: sql2`COALESCE(SUM(${budgetExpenditures.budget_2025_adopted})::float8, 0)`.as("total_budget_2025")
      }).from(budgetExpenditures).groupBy(budgetExpenditures.department).orderBy(sql2`SUM(${budgetExpenditures.budget_2025_adopted}) DESC NULLS LAST`);
      const totalBudget = await db.select({
        total_2024: sql2`COALESCE(SUM(${budgetExpenditures.budget_2024_amended})::float8, 0)`.as("total_2024"),
        total_2025: sql2`COALESCE(SUM(${budgetExpenditures.budget_2025_adopted})::float8, 0)`.as("total_2025")
      }).from(budgetExpenditures);
      res.json({
        total_2024: totalBudget[0]?.total_2024 || 0,
        total_2025: totalBudget[0]?.total_2025 || 0,
        departments: result
      });
    } catch (error) {
      console.error("Error fetching budget summary:", error);
      res.status(500).json({ message: "Failed to fetch budget data" });
    }
  });
  app2.get("/api/budget/department/:department", async (req, res) => {
    try {
      const { department } = req.params;
      const result = await db.select().from(budgetExpenditures).where(sql2`${budgetExpenditures.department} = ${department}`);
      res.json(result);
    } catch (error) {
      console.error("Error fetching department budget:", error);
      res.status(500).json({ message: "Failed to fetch department data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5000",
    "http://localhost:5173",
    process.env.GITHUB_PAGES_URL || ""
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    log("Starting server initialization...");
    const startupTimeout = setTimeout(() => {
      console.error("STARTUP TIMEOUT: Server failed to start within 30 seconds");
      process.exit(1);
    }, 3e4);
    try {
      log("Registering routes and connecting to database...");
      const server = await registerRoutes(app);
      log("Routes registered successfully");
      app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
      });
      if (app.get("env") === "development") {
        log("Setting up Vite dev server...");
        await setupVite(app, server);
        log("Vite dev server configured");
      } else {
        log("Serving static files...");
        serveStatic(app);
        log("Static files configured");
      }
      const port = parseInt(process.env.PORT || "5000", 10);
      log(`Attempting to listen on port ${port}...`);
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true
      }, () => {
        clearTimeout(startupTimeout);
        log(`\u2713 Server successfully serving on port ${port}`);
      });
      server.on("error", (error) => {
        clearTimeout(startupTimeout);
        console.error("Server error:", error);
        if (error.code === "EADDRINUSE") {
          console.error(`Port ${port} is already in use`);
        }
        process.exit(1);
      });
    } catch (initError) {
      clearTimeout(startupTimeout);
      console.error("Initialization error:", initError);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal startup error:", error);
    process.exit(1);
  }
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
})();

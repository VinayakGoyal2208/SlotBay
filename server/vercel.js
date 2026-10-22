import express from "express";
import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { createApp } from "./app.js";
import { connectDatabase } from "./database.js";
import { runMaintenance } from "./maintenance.js";

function authorizedCron(req) {
  const expected = Buffer.from("Bearer " + process.env.CRON_SECRET);
  const actual = Buffer.from(req.get("authorization") || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createVercelApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(async (req, res, next) => {
    const maintenance = req.path === "/api/internal/maintenance";
    res.set("Cache-Control", "private, no-store");
    if (maintenance) {
      if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32)
        return res.status(503).json({ message: "Maintenance secret is not configured" });
      if (!authorizedCron(req)) return res.status(401).json({ message: "Unauthorized" });
      if (req.method !== "GET") return res.status(405).set("Allow", "GET").end();
    }
    try {
      if (req.path.startsWith("/api/") || req.path.startsWith("/slot/") || req.path === "/sitemap.xml")
        await connectDatabase();
      if (maintenance) return res.json(await runMaintenance({ force: true }));
    } catch (error) {
      // Configuration errors name keys only. Never log driver errors containing a URI.
      console.error(
        "SlotBay initialization failed:",
        error.code === "SERVER_CONFIGURATION_REQUIRED" ? error.message : error.name,
      );
      return res.status(503).json({
        message: "Backend unavailable. Check the server environment settings and database access.",
        code: error.code === "SERVER_CONFIGURATION_REQUIRED" ? error.code : "DATABASE_UNAVAILABLE",
      });
    }
    if (req.path.startsWith("/api/v1/") && req.path !== "/api/v1/health") {
      const finished = new Promise((resolve) => {
        const done = () => {
          res.off("finish", done);
          res.off("close", done);
          resolve();
        };
        res.once("finish", done);
        res.once("close", done);
      });
      // Register before responding so Vercel keeps the invocation alive for queued work.
      waitUntil(
        finished
          .then(() => runMaintenance())
          .catch(() => console.error("Background processing failed; will retry")),
      );
    }
    next();
  });
  const website = createApp();
  // Vercel overwrites X-Forwarded-For with the connecting client address.
  if (process.env.VERCEL === "1" && !process.env.TRUST_PROXY_HOPS) website.set("trust proxy", 1);
  app.use(website);
  return app;
}

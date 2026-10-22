import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { authRouter, loadAuth } from "./auth.js";
import { filesRouter } from "./files.js";
import { resources } from "./resources.js";
import { Listing } from "./models.js";
import { fail } from "./security.js";
const project = fileURLToPath(new URL("../", import.meta.url));
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY_HOPS) app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"],
          frameSrc: ["https://www.openstreetmap.org"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );
  app.use(compression());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: process.env.NODE_ENV === "test" ? 10000 : 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/v1/auth",
    rateLimit({
      windowMs: 15 * 60000,
      limit: process.env.NODE_ENV === "test" ? 10000 : 30,
      skip: (req) => ["session", "logout"].some((p) => req.path === `/${p}`),
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-SlotBay-Request") !== "1")
        return res.status(403).json({ message: "Request verification failed" });
      const origin = req.get("Origin");
      const allowed = [process.env.SITE_URL || "http://localhost:5173"];
      if (process.env.NODE_ENV !== "production")
        allowed.push("http://127.0.0.1:5173", "http://localhost:4000", "http://127.0.0.1:4000");
      if (origin && !allowed.includes(origin))
        return res.status(403).json({ message: "Origin not allowed" });
      if (
        !req.path.startsWith("/v1/files/upload") &&
        req.method !== "DELETE" &&
        !req.is("application/json")
      )
        return res.status(415).json({ message: "JSON body required" });
    }
    next();
  });
  app.use(cookieParser());
  app.use(express.json({ limit: "64kb" }));
  app.get("/api/v1/health", (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? "ok" : "database_unavailable" }),
  );
  app.use("/api/v1", loadAuth);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/files", filesRouter);
  app.use("/api/v1", resources);
  app.use("/api", (_req, _res) => fail(404, "API route not found"));
  app.get("/robots.txt", (_req, res) => {
    const origin = process.env.SITE_URL || "http://localhost:4000";
    res
      .type("text")
      .send(
        `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth\nDisallow: /account\nDisallow: /bookings\nDisallow: /owner\nDisallow: /admin\nDisallow: /dashboard\nSitemap: ${origin}/sitemap.xml\n`,
      );
  });
  app.get("/sitemap.xml", async (_req, res) => {
    const origin = (process.env.SITE_URL || "http://localhost:4000").replace(/\/$/, "");
    const rows = await Listing.find({ verified: true, archived: false }).select("_id").limit(45000);
    const urls = [
      "/",
      "/how-it-works",
      "/for-owners",
      ...rows.map((r) => `/slot/${encodeURIComponent(r._id)}`),
    ];
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${escape(origin + u)}</loc></url>`).join("")}</urlset>`,
      );
  });
  app.use(
    "/assets",
    express.static(path.join(project, "dist/assets"), {
      immutable: true,
      maxAge: "1y",
      fallthrough: false,
    }),
  );
  app.use(express.static(path.join(project, "dist"), { index: false, maxAge: "1h" }));
  app.get("/{*path}", async (req, res) => {
    const origin = (process.env.SITE_URL || "http://localhost:4000").replace(/\/$/, "");
    const known = [
      "/",
      "/how-it-works",
      "/for-owners",
      "/auth",
      "/account",
      "/bookings",
      "/owner",
      "/admin",
      "/dashboard",
    ];
    let title = "SlotBay — Private parking, right where you need it",
      description =
        "Find and reserve verified parking near metro stations, offices and neighbourhoods.";
    let status = known.includes(req.path) ? 200 : 404,
      index = ["/", "/how-it-works", "/for-owners"].includes(req.path);
    let structured = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SlotBay",
      url: origin,
    };
    if (req.path.startsWith("/slot/")) {
      const l = await Listing.findOne({ _id: req.path.slice(6), verified: true, archived: false });
      if (l) {
        status = 200;
        index = true;
        title = `${l.title} — SlotBay`;
        description = `Reserve parking at ${l.address}. Hourly ₹${l.hourly}, daily ₹${l.daily}, monthly ₹${l.monthly}.`;
        structured = {
          "@context": "https://schema.org",
          "@type": "ParkingFacility",
          name: l.title,
          address: l.address,
          geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
          url: origin + req.path,
        };
      }
    }
    if (req.path === "/how-it-works") title = "How parking reservations work — SlotBay";
    if (req.path === "/for-owners") title = "Earn from your unused parking — SlotBay";
    if (status === 404) title = "Page not found — SlotBay";
    const metadata = `<title data-server-seo>${escape(title)}</title><meta data-server-seo name="description" content="${escape(description)}"><meta data-server-seo name="robots" content="${index ? "index, follow" : "noindex, follow"}"><link data-server-seo rel="canonical" href="${escape(origin + req.path)}"><meta data-server-seo property="og:title" content="${escape(title)}"><meta data-server-seo property="og:description" content="${escape(description)}"><meta data-server-seo property="og:url" content="${escape(origin + req.path)}"><meta data-server-seo property="og:type" content="website"><meta data-server-seo property="og:image" content="${escape(origin)}/og-cover.jpg"><meta data-server-seo name="twitter:card" content="summary_large_image"><script data-server-seo type="application/ld+json">${JSON.stringify(structured).replace(/</g, "\\u003c")}</script>`;
    try {
      const html = await readFile(path.join(project, "dist/index.html"), "utf8");
      res.status(status).type("html").send(html.replace("<!--slotbay-head-->", metadata));
    } catch {
      res
        .status(503)
        .type("text")
        .send("Frontend build unavailable. Run npm run build, or use the Vite development server.");
    }
  });
  app.use((err, _req, res, _next) => {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    if (err.code === 11000)
      return res.status(409).json({
        message:
          "An account already uses these credentials, phone, vehicle or identity details. Contact the administrator if you need a correction.",
      });
    const status = err.status || (err.name === "StrictModeError" ? 400 : 500);
    if (status >= 500)
      console.error("Request failed:", process.env.NODE_ENV === "test" ? err.stack : err.name);
    res
      .status(status)
      .json({ message: status >= 500 ? "Service unavailable. Please try again." : err.message });
  });
  return app;
}

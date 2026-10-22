import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import supertest from "supertest";
import { createVercelApp } from "../vercel.js";
import { connectDatabase } from "../database.js";
import { runMaintenance } from "../maintenance.js";
import { Auth, User, Vehicle, Upload } from "../models.js";
import { checkFile, MAX_UPLOAD_MB } from "../../src/lib/validation.js";

let repl, app, accountId;
const origin = "https://slotbay.example.test";
const password = "Test-" + randomBytes(16).toString("hex");
const cronSecret = randomBytes(32).toString("hex");

before(
  async () => {
    // This suite never reads .env or contacts the live database.
    process.env.NODE_ENV = "test";
    process.env.VERCEL = "1";
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.SITE_URL = origin;
    process.env.CRON_SECRET = cronSecret;
    delete process.env.SMTP_HOST;
    repl = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
      instanceOpts: [{ launchTimeout: 60000 }],
    });
    process.env.MONGO_URI = repl.getUri();
    app = createVercelApp();
  },
  { timeout: 180000 },
);

after(async () => {
  if (mongoose.connection.readyState === 1) await runMaintenance({ force: true });
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test("concurrent cold-start health requests connect once and return JSON", async () => {
  const results = await Promise.all(
    Array.from({ length: 4 }, () => supertest(app).get("/api/v1/health")),
  );
  for (const result of results) {
    assert.equal(result.status, 200);
    assert.equal(result.body.status, "ok");
  }
  assert.equal((await connectDatabase()).connection.getClient().options.maxPoolSize, 5);
});

test("search, session and protected API routes return JSON, not an HTML fallback", async () => {
  const search = await supertest(app).get("/api/v1/search?location=missing");
  assert.equal(search.status, 200);
  assert.ok(Array.isArray(search.body.data));
  const session = await supertest(app).get("/api/v1/auth/session");
  assert.equal(session.status, 200);
  assert.match(session.headers["content-type"], /json/);
  const missing = await supertest(app).get("/api/v1/not-a-route");
  assert.equal(missing.status, 401);
  assert.match(missing.headers["content-type"], /json/);
});

test("function serves route metadata and genuine page 404s from the bundled HTML", async () => {
  for (const path of ["/", "/auth", "/how-it-works"]) {
    const page = await supertest(app).get(path);
    assert.equal(page.status, 200);
    assert.match(page.text, new RegExp(origin.replaceAll(".", "\\.")));
    assert.match(page.text, /rel="canonical"/);
    if (path === "/auth") assert.match(page.text, /noindex/);
  }
  assert.equal((await supertest(app).get("/not-a-page")).status, 404);
  assert.match((await supertest(app).get("/robots.txt")).text, /sitemap.xml/);
  assert.match((await supertest(app).get("/sitemap.xml")).text, /urlset/);
});

test("registration, session cookies and binary document upload survive the function adapter", async () => {
  const client = supertest.agent(app);
  const registered = await client
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .set("X-SlotBay-Request", "1")
    .send({
      email: "vercel-driver@example.test",
      password,
      full_name: "Vercel Test Driver",
      phone: "9876543291",
      account_type: "user",
      vehicle: { vehicle_type: "4W", plate: "KA01AB1291", licence_number: "KA0120190001291" },
    });
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  accountId = registered.body.session.user.id;
  assert.equal(await Auth.countDocuments(), 1);
  assert.equal(await User.countDocuments(), 1);
  assert.equal(await Vehicle.countDocuments(), 1);
  assert.match(registered.headers["set-cookie"][0], /HttpOnly/);
  const session = await client.get("/api/v1/auth/session");
  assert.ok(JSON.stringify(session.body).includes(accountId));
  const bytes = Buffer.alloc(12 * 1024, 0);
  Buffer.from([0xff, 0xd8, 0xff, 0xdb]).copy(bytes);
  const path = accountId + "/licence.jpg";
  const uploaded = await client
    .post("/api/v1/files/upload?bucket=documents&path=" + path)
    .set("Origin", origin)
    .set("X-SlotBay-Request", "1")
    .set("Content-Type", "application/octet-stream")
    .send(bytes);
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
  const signed = await client.get("/api/v1/files/signed?bucket=documents&path=" + path);
  assert.equal(signed.status, 200);
  const content = await client.get(signed.body.signedUrl);
  assert.equal(content.status, 200);
  assert.deepEqual(content.body, bytes);
  const oversized = await client
    .post("/api/v1/files/upload?bucket=documents&path=" + accountId + "/large.jpg")
    .set("X-SlotBay-Request", "1")
    .set("Content-Type", "application/octet-stream")
    .send(Buffer.alloc(MAX_UPLOAD_MB * 1024 * 1024 + 1));
  assert.equal(oversized.status, 413);
  assert.equal(await Upload.countDocuments(), 1);
  assert.match(
    checkFile({ type: "image/jpeg", size: MAX_UPLOAD_MB * 1024 * 1024 + 1 }, { label: "Photo" }),
    /4 MB/,
  );
  const hostile = await client
    .post("/api/v1/auth/logout")
    .set("Origin", "https://evil.example")
    .set("X-SlotBay-Request", "1")
    .send({});
  assert.equal(hostile.status, 403);
});

test("scheduled maintenance requires its private secret and never a browser session", async () => {
  assert.equal((await supertest(app).get("/api/internal/maintenance")).status, 401);
  assert.equal(
    (await supertest(app).get("/api/internal/maintenance").set("Authorization", "Bearer wrong"))
      .status,
    401,
  );
  const job = await supertest(app)
    .get("/api/internal/maintenance")
    .set("Authorization", "Bearer " + cronSecret);
  assert.equal(job.status, 200);
  assert.equal(job.body.status, "ok");
  assert.equal(
    (
      await supertest(app)
        .post("/api/internal/maintenance")
        .set("Authorization", "Bearer " + cronSecret)
    ).status,
    405,
  );
});

test("missing deployment configuration returns a useful JSON error without secrets", async () => {
  const saved = process.env.MONGO_URI;
  delete process.env.MONGO_URI;
  try {
    const result = await supertest(app).get("/api/v1/health");
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "SERVER_CONFIGURATION_REQUIRED");
    assert.ok(!result.text.includes(saved));
  } finally {
    process.env.MONGO_URI = saved;
  }
});

test("Vercel build keeps HTML in the function and public assets in the CDN output", async () => {
  const html = await readFile(new URL("../../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<!--slotbay-head-->/);
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.outputDirectory, "dist/static");
  await assert.rejects(readFile(new URL("../../dist/static/index.html", import.meta.url)), {
    code: "ENOENT",
  });
  assert.match(
    await readFile(new URL("../../dist/static/favicon.svg", import.meta.url), "utf8"),
    /svg/,
  );
  assert.equal(config.rewrites.at(-1).destination, "/api/handler");
});

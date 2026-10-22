import { test, before, after } from "node:test";
import net from "node:net";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import supertest from "supertest";
import { createApp } from "../app.js";
import * as M from "../models.js";
import { seedAdmin } from "../seed-admin.js";
import { encrypt } from "../security.js";
import { settleElapsedBookings } from "../bookings.js";
import { deliverApprovalEmails } from "../email.js";
let repl, app, driver, other, owner, admin, driverId, ownerId, listing, booking, docPath;
const password = `Test-Aa1-${randomBytes(12).toString("hex")}`;
const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const write = (agent, method, url, body) =>
  agent[method]("/api/v1" + url)
    .set("X-SlotBay-Request", "1")
    .send(body);
let sequence = 0;
async function register(agent, email, type) {
  sequence++;
  const r = await write(agent, "post", "/auth/register", {
    email,
    password,
    full_name: "Alex Parking",
    phone: `987654321${sequence}`,
    ...(type === "user"
      ? {
          vehicle: {
            vehicle_type: "4W",
            plate: `KA01AB123${sequence}`,
            licence_number: `KA012019000123${sequence}`,
          },
        }
      : {}),
    account_type: type,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.session.user.id;
}
before(
  async () => {
    process.env.NODE_ENV = "test";
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.SITE_URL = "http://localhost:4000";
    repl = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
      instanceOpts: [{ launchTimeout: 60000 }],
    });
    await mongoose.connect(repl.getUri());
    for (const model of Object.values(mongoose.models)) await model.init();
    app = createApp();
    driver = supertest.agent(app);
    other = supertest.agent(app);
    owner = supertest.agent(app);
    admin = supertest.agent(app);
    driverId = await register(driver, "driver@example.test", "user");
    await register(other, "other@example.test", "user");
    ownerId = await register(owner, "owner@example.test", "owner");
    await seedAdmin("admin@gmail.com", password);
    const login = await write(admin, "post", "/auth/login", { email: "admin@gmail.com", password });
    assert.equal(login.status, 200);
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
test("auth is centralized, profiles separate, plaintext absent and admin cannot self-register", async () => {
  assert.equal(await M.Auth.countDocuments(), 4);
  assert.equal(await M.User.countDocuments(), 2);
  assert.equal(await M.Owner.countDocuments(), 1);
  assert.equal(await M.Admin.countDocuments(), 1);
  const a = await M.Auth.findById(driverId).select("+password_hash");
  assert.notEqual(a.password_hash, password);
  assert.match(a.password_hash, /^scrypt:/);
  assert.equal(
    (
      await write(other, "post", "/auth/register", {
        email: "admin@gmail.com",
        password,
        full_name: "Attacker",
        phone: "9876543210",
        account_type: "admin",
      })
    ).status,
    400,
  );
  assert.equal((await driver.get("/api/v1/auth")).status, 404);
  assert.equal((await driver.get("/api/v1/reports")).status, 403);
  assert.equal(
    (
      await supertest(app)
        .post("/api/v1/auth/login")
        .send({ email: "driver@example.test", password })
    ).status,
    403,
  );
  assert.equal(
    (
      await driver
        .post("/api/v1/auth/logout")
        .set("X-SlotBay-Request", "1")
        .set("Origin", "https://evil.example")
        .send({})
    ).status,
    403,
  );
});
test("uploads validate content and protect signed document reads", async () => {
  docPath = `${driverId}/licence.pdf`;
  const pdf = Buffer.from("%PDF-1.7\n" + " ".repeat(11000));
  let r = await driver
    .post("/api/v1/files/upload?" + new URLSearchParams({ bucket: "documents", path: docPath }))
    .set("X-SlotBay-Request", "1")
    .set("Content-Type", "application/pdf")
    .send(pdf);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await other.get(
    "/api/v1/files/signed?" + new URLSearchParams({ bucket: "documents", path: docPath }),
  );
  assert.equal(r.status, 403);
  r = await admin.get(
    "/api/v1/files/signed?" + new URLSearchParams({ bucket: "documents", path: docPath }),
  );
  assert.equal(r.status, 200);
  assert.equal((await supertest(app).get(r.body.signedUrl)).status, 200);
  const stored = await M.Upload.findOne({ path: docPath }).select("+data");
  assert.ok(!stored.data.includes("%PDF"));
  assert.equal(
    (
      await driver
        .post(
          "/api/v1/files/upload?" +
            new URLSearchParams({ bucket: "documents", path: `${driverId}/fake.png` }),
        )
        .set("X-SlotBay-Request", "1")
        .set("Content-Type", "image/png")
        .send(Buffer.alloc(11000))
    ).status,
    400,
  );
});
test("driver activates immediately, document completion locks records and forged status is rejected", async () => {
  const body = {
    user_id: driverId,
    vehicle_type: "4W",
    plate: "KA01AB1231",
    licence_number: "KA0120190001231",
    licence_path: docPath,
    rc_path: docPath,
  };
  assert.equal(
    (await write(driver, "post", "/driver-details", { ...body, status: "approved" })).status,
    400,
  );
  assert.equal((await write(driver, "post", "/driver-details", body)).status, 201);
  assert.equal((await M.Vehicle.findOne({ user_id: driverId })).status, "approved");
  assert.equal(
    (await write(driver, "post", "/driver-details", { ...body, plate: "KA01AB9999" })).status,
    409,
  );
  assert.equal(
    (
      await write(driver, "patch", `/profiles/${driverId}`, {
        full_name: "Changed Name",
        phone: "9876543211",
      })
    ).status,
    409,
  );
});
test("owner registration, private verification and listing publication", async () => {
  // Fixtures emulate uploaded files; file boundary is tested above.
  const paths = ["id.pdf", "property.pdf", "place1.jpg", "place2.jpg"].map(
    (p) => `${ownerId}/${p}`,
  );
  for (const p of paths)
    await M.Upload.create({
      user_id: ownerId,
      bucket: "documents",
      path: p,
      mime: "application/pdf",
      size: 12000,
      data: encrypt("fixture"),
    });
  const v = {
    user_id: ownerId,
    id_type: "pan",
    id_number: "ABCPA1234A",
    property_doc_type: "sale_deed",
    place_address: "123 Station Road Bengaluru",
    account_holder: "Alex Parking",
    account_number: "12345678901",
    ifsc: "HDFC0001234",
    id_doc_path: paths[0],
    property_doc_path: paths[1],
    photo_paths: paths.slice(2),
  };
  assert.equal((await write(owner, "post", "/owner-applications", v)).status, 201);
  assert.equal(
    (
      await write(owner, "patch", `/owner-applications/${ownerId}`, {
        status: "approved",
        admin_note: null,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await write(admin, "patch", `/owner-applications/${ownerId}`, {
        status: "approved",
        admin_note: null,
      })
    ).status,
    200,
  );
  const raw = await M.OwnerApplication.findOne({ user_id: ownerId });
  assert.notEqual(raw.account_number, v.account_number);
  const photo = `${ownerId}/cover.jpg`;
  await M.Upload.create({
    user_id: ownerId,
    bucket: "listing-photos",
    path: photo,
    mime: "image/jpeg",
    size: 12000,
    data: encrypt("fixture"),
  });
  const row = {
    owner_id: ownerId,
    title: "Metro parking",
    city: "Bengaluru",
    area: "Indiranagar",
    address: "123 Station Road Bengaluru",
    landmark: "Metro",
    size: "2.5 x 5 m",
    hourly: 50,
    daily: 200,
    monthly: 3000,
    total: 1,
    lat: 12.97,
    lng: 77.59,
    opens_at: "00:00",
    closes_at: "00:00",
    rental_rules: "No overnight camping",
    vehicles: ["4W"],
    amenities: ["Covered"],
    photo_url: photo,
    photo_paths: [],
  };
  const r = await write(owner, "post", "/listings", row);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  listing = r.body;
  assert.equal((await supertest(app).get("/api/v1/search")).body.data.length, 0);
  assert.equal(
    (await write(driver, "patch", `/listings/${listing.id}`, { verified: true })).status,
    403,
  );
  assert.equal(
    (await write(admin, "patch", `/listings/${listing.id}`, { verified: true })).status,
    200,
  );
  assert.equal((await supertest(app).get("/api/v1/search?q=Metro&vehicle=4W")).body.data.length, 1);
  assert.equal(await M.Location.countDocuments(), 1);
});
test("concurrent requests cannot overbook, pricing is server-owned and idempotency works", async () => {
  const row = {
    user_id: driverId,
    listing_id: listing.id,
    booking_date: date,
    start_time: "09:00",
    hours: 2,
    vehicle: "4W",
    plate: "KA01AB1231",
  };
  assert.equal(
    (
      await driver
        .post("/api/v1/bookings")
        .set("X-SlotBay-Request", "1")
        .set("Idempotency-Key", randomUUID())
        .send({ ...row, amount: 1 })
    ).status,
    400,
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      driver
        .post("/api/v1/bookings")
        .set("X-SlotBay-Request", "1")
        .set("Idempotency-Key", randomUUID())
        .send(row),
    ),
  );
  assert.equal(
    results.filter((r) => r.status === 201).length,
    1,
    JSON.stringify(results.map((r) => [r.status, r.body])),
  );
  assert.equal(results.filter((r) => r.status === 409).length, 7);
  booking = results.find((r) => r.status === 201).body;
  assert.equal(booking.amount, 100);
  assert.equal(booking.status, "Confirmed");
  const stored = await M.Booking.findById(booking.id);
  const again = await driver
    .post("/api/v1/bookings")
    .set("X-SlotBay-Request", "1")
    .set("Idempotency-Key", stored.idempotency_key)
    .send(row);
  assert.equal(again.body.id, booking.id);
  assert.equal(await M.Payment.countDocuments(), 1);
  assert.equal(await M.Notification.countDocuments({ booking_id: booking.id }), 2);
  assert.equal((await other.get("/api/v1/bookings?user_id=" + driverId)).body.length, 0);
  assert.equal(
    (await write(other, "patch", `/bookings/${booking.id}`, { status: "Cancelled" })).status,
    403,
  );
  assert.equal(
    (await write(owner, "patch", `/bookings/${booking.id}`, { status: "Completed" })).status,
    409,
  );
});
test("block conflicts, cancellations, notifications and disputes persist", async () => {
  const block = { listing_id: listing.id, block_date: date, starts_at: "10:00", ends_at: "12:00" };
  assert.equal((await write(owner, "post", "/listing-blocks", block)).status, 409);
  assert.equal(
    (
      await write(driver, "post", "/disputes", {
        user_id: driverId,
        booking_id: booking.id,
        message: "Please help with my reservation",
      })
    ).status,
    201,
  );
  assert.equal(
    (await write(driver, "patch", `/bookings/${booking.id}`, { status: "Cancelled" })).status,
    200,
  );
  const r = await write(owner, "post", "/listing-blocks", block);
  assert.equal(r.status, 201);
  const availability = await supertest(app).get(
    `/api/v1/availability?date=${date}&start=10:00&hours=1`,
  );
  assert.equal(availability.body[0].available, 0);
  assert.equal((await write(owner, "delete", `/listing-blocks/${r.body.id}`, {})).status, 200);
  assert.ok((await driver.get("/api/v1/notifications")).body.length >= 2);
  const reports = await admin.get("/api/v1/reports");
  assert.equal(reports.status, 200);
  assert.equal(reports.body.collected_revenue_inr, 0);
  assert.equal((await admin.get("/sitemap.xml")).status, 200);
});
test("instant confirmation ignores old approval setting, archive review and scheduled settlement", async () => {
  assert.equal(
    (await write(owner, "patch", `/listings/${listing.id}`, { auto_approve: false })).status,
    400,
  );
  await M.Listing.updateOne({ _id: listing.id }, { $set: { auto_approve: false } });
  const row = {
    user_id: driverId,
    listing_id: listing.id,
    booking_date: date,
    start_time: "13:00",
    hours: 1,
    vehicle: "4W",
    plate: "KA01AB1231",
  };
  let r = await driver
    .post("/api/v1/bookings")
    .set("X-SlotBay-Request", "1")
    .set("Idempotency-Key", randomUUID())
    .send(row);
  assert.equal(r.status, 201);
  const pending = r.body;
  assert.equal(pending.status, "Confirmed");
  assert.equal(
    (await write(owner, "patch", `/bookings/${pending.id}`, { status: "Confirmed" })).status,
    409,
  );
  assert.equal(
    (await write(owner, "patch", `/listings/${listing.id}`, { archived: true })).status,
    200,
  );
  assert.equal((await supertest(app).get("/api/v1/search")).body.data.length, 0);
  assert.equal((await driver.get("/api/v1/bookings")).body.length, 2);
  assert.equal(
    (await write(owner, "patch", `/listings/${listing.id}`, { archived: false })).status,
    200,
  );
  assert.equal((await supertest(app).get("/api/v1/search")).body.data.length, 0);
  assert.equal(
    (await write(admin, "patch", `/listings/${listing.id}`, { verified: true })).status,
    200,
  );
  await M.Booking.updateOne(
    { _id: pending.id },
    {
      $set: { starts_at: new Date(Date.now() - 7200000), ends_at: new Date(Date.now() - 3600000) },
    },
  );
  await settleElapsedBookings();
  assert.equal((await M.Booking.findById(pending.id)).status, "Completed");
  const n = await M.Notification.countDocuments({ booking_id: pending.id });
  await settleElapsedBookings();
  assert.equal(await M.Notification.countDocuments({ booking_id: pending.id }), n);
});
test("identity claims stop duplicate phones, vehicles and licences, including concurrent registration", async () => {
  const base = {
    password,
    full_name: "Test Driver",
    phone: "9876543299",
    account_type: "user",
    vehicle: { vehicle_type: "4W", plate: "KA01AB1231", licence_number: "KA0120190001299" },
  };
  assert.equal(
    (
      await write(supertest.agent(app), "post", "/auth/register", {
        ...base,
        email: "duplicate-car@example.test",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await write(supertest.agent(app), "post", "/auth/register", {
        ...base,
        email: "duplicate-licence@example.test",
        vehicle: { ...base.vehicle, plate: "KA01AB9999", licence_number: "KA0120190001231" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await write(supertest.agent(app), "post", "/auth/register", {
        ...base,
        email: "duplicate-phone@example.test",
        phone: "9876543211",
        vehicle: { ...base.vehicle, plate: "KA01AB9999" },
      })
    ).status,
    409,
  );
  assert.equal(await M.Auth.countDocuments({ email: /duplicate-/ }), 0);
  const parallel = await Promise.all(
    [1, 2].map((n) =>
      write(supertest.agent(app), "post", "/auth/register", {
        ...base,
        email: `race${n}@example.test`,
        phone: `987654328${n}`,
        vehicle: { vehicle_type: "4W", plate: "KA01AB8888", licence_number: `KA012019000128${n}` },
      }),
    ),
  );
  assert.deepEqual(parallel.map((r) => r.status).sort(), [201, 409]);
});
test("owner receives scoped arrival details and bay changes preserve reservations", async () => {
  let r = await write(owner, "patch", `/listings/${listing.id}`, { total: 2 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.verified, true);
  const row = {
    user_id: driverId,
    listing_id: listing.id,
    booking_date: date,
    start_time: "15:00",
    hours: 2,
    vehicle: "4W",
    plate: "KA01AB1231",
  };
  const results = await Promise.all(
    [1, 2].map(() =>
      driver
        .post("/api/v1/bookings")
        .set("X-SlotBay-Request", "1")
        .set("Idempotency-Key", randomUUID())
        .send(row),
    ),
  );
  assert.ok(results.every((r) => r.status === 201));
  assert.equal((await write(owner, "patch", `/listings/${listing.id}`, { total: 1 })).status, 409);
  const arrivals = await owner.get("/api/v1/bookings");
  const arrival = arrivals.body.find((b) => b.id === results[0].body.id);
  assert.equal(arrival.arrival.full_name, "Alex Parking");
  assert.equal(arrival.arrival.phone, "9876543211");
  assert.equal(arrival.plate, "KA01AB1231");
  assert.ok(arrival.created_at && arrival.updated_at);
  assert.ok(!JSON.stringify(arrival).includes("licence_path"));
  const outsider = await other.get("/api/v1/bookings");
  assert.equal(outsider.body.length, 0);
  for (const reservation of results)
    assert.equal(
      (await write(driver, "patch", `/bookings/${reservation.body.id}`, { status: "Cancelled" }))
        .status,
      200,
    );
  assert.equal((await write(owner, "patch", `/listings/${listing.id}`, { total: 1 })).status, 200);
  assert.equal((await supertest(app).get("/api/v1/search?q=Stat")).body.data.length, 1);
  assert.equal((await supertest(app).get("/api/v1/search?q=%5B")).status, 200);
});
test("private correction reports require admin decisions, reasons and uniqueness checks", async () => {
  const v = {
    category: "profile",
    message: "Please correct my registered phone number",
    proposed: { full_name: "Alex Parking", phone: "9876543277" },
  };
  let r = await write(driver, "post", "/change-requests", v);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.id;
  assert.equal((await write(driver, "post", "/change-requests", v)).status, 409);
  assert.equal((await other.get("/api/v1/change-requests")).body.length, 0);
  assert.equal(
    (
      await write(driver, "patch", `/change-requests/${id}`, {
        status: "Approved",
        admin_note: "Looks correct",
      })
    ).status,
    403,
  );
  assert.equal(
    (await write(admin, "patch", `/change-requests/${id}`, { status: "Rejected", admin_note: "" }))
      .status,
    400,
  );
  r = await write(admin, "patch", `/change-requests/${id}`, {
    status: "Approved",
    admin_note: "Correction checked with account holder",
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await M.User.findById(driverId)).phone, "9876543277");
  assert.ok(r.body.resolved_at);
  assert.equal(
    (
      await write(admin, "patch", `/change-requests/${id}`, {
        status: "Approved",
        admin_note: "Repeat",
      })
    ).status,
    409,
  );
  const duplicate = await write(driver, "post", "/change-requests", {
    ...v,
    proposed: { full_name: "Alex Parking", phone: "9876543212" },
  });
  assert.equal(duplicate.status, 201);
  assert.equal(
    (
      await write(admin, "patch", `/change-requests/${duplicate.body.id}`, {
        status: "Approved",
        admin_note: "Attempt duplicate",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await write(admin, "patch", `/change-requests/${duplicate.body.id}`, {
        status: "Rejected",
        admin_note: "This phone belongs to another account",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await write(admin, "patch", `/driver-details/${driverId}`, {
        status: "rejected",
        admin_note: "",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await write(admin, "patch", `/owner-applications/${ownerId}`, {
        status: "rejected",
        admin_note: "",
      })
    ).status,
    400,
  );
  const appRecord = await M.OwnerApplication.findOne({ user_id: ownerId });
  const payload = {
    ...appRecord.toObject(),
    id_number: "ABCPA1234A",
    account_number: "12345678901",
  };
  for (const key of [
    "_id",
    "created_at",
    "updated_at",
    "status",
    "admin_note",
    "reviewed_at",
    "locked_at",
    "submitted_at",
  ])
    delete payload[key];
  assert.equal((await write(owner, "post", "/owner-applications", payload)).status, 409);
});
test("owner approval email is queued once, delivered through SMTP, and not sent again", async () => {
  const count = await M.EmailJob.countDocuments();
  assert.ok(count > 0);
  assert.equal((await deliverApprovalEmails()).configured, false);
  assert.equal(
    (
      await write(admin, "patch", `/owner-applications/${ownerId}`, {
        status: "approved",
        admin_note: null,
      })
    ).status,
    200,
  );
  assert.equal(
    await M.EmailJob.countDocuments(),
    count,
    "Repeating approval must not enqueue duplicate email",
  );
  const messages = [];
  let deferDelivery = true;
  const smtp = net.createServer((socket) => {
    socket.write("220 test.local ESMTP\r\n");
    let buffer = "",
      inData = false,
      body = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n");
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === ".") {
            if (deferDelivery) {
              body = "";
              inData = false;
              socket.write("450 Temporary mail service failure\r\n");
              continue;
            }
            messages.push(body);
            body = "";
            inData = false;
            socket.write("250 Message accepted\r\n");
          } else body += line + "\r\n";
        } else if (/^EHLO|^HELO/.test(line)) socket.write("250 test.local\r\n");
        else if (line === "DATA") {
          inData = true;
          socket.write("354 End with dot\r\n");
        } else if (line === "QUIT") socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(smtp.address().port);
  process.env.MAIL_FROM = "support@example.test";
  try {
    assert.equal((await deliverApprovalEmails()).sent, 0);
    assert.equal(await M.EmailJob.countDocuments({ status: "pending", attempts: 1 }), count);
    assert.equal(messages.length, 0);
    deferDelivery = false;
    await M.EmailJob.updateMany({ status: "pending" }, { $set: { next_attempt_at: new Date(0) } });
    const result = await deliverApprovalEmails();
    assert.equal(result.sent, count);
    assert.equal(messages.length, count);
    assert.match(messages[0], /Your SlotBay owner account is approved/);
    assert.match(messages[0], /owner@example.test/);
    assert.match(messages[0], /http:\/\/localhost:4000\/owner/);
    assert.equal(await M.EmailJob.countDocuments({ status: "sent" }), count);
    assert.equal((await deliverApprovalEmails()).sent, 0);
    assert.equal(messages.length, count);
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.MAIL_FROM;
    await new Promise((resolve) => smtp.close(resolve));
  }
});

test("removed password recovery endpoints return 404 without changing credentials", async () => {
  const before = await M.Auth.findById(driverId).select("+password_hash");
  for (const route of ["/auth/forgot-password", "/auth/reset-password"])
    assert.equal(
      (await write(other, "post", route, { email: "driver@example.test", password })).status,
      404,
    );
  const after = await M.Auth.findById(driverId).select("+password_hash");
  assert.equal(after.password_hash, before.password_hash);
  assert.equal(M.Reset, undefined);
});

test("suspension revokes sessions and removes public listings", async () => {
  assert.equal(
    (await write(admin, "patch", `/profiles/${ownerId}`, { suspended: true })).status,
    200,
  );
  assert.equal((await owner.get("/api/v1/listings")).status, 401);
  assert.equal((await supertest(app).get("/api/v1/search")).body.data.length, 0);
});

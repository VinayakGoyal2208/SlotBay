import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { createApp } from "../app.js";
import { seedDemo } from "../seed-demo.js";
import { seedAdmin } from "../seed-admin.js";
const port = Number(process.env.PREVIEW_PORT || 4000);
process.env.NODE_ENV = "development";
process.env.ALLOW_DEMO_SEED = "true";
process.env.SITE_URL = `http://localhost:${port}`;
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
const db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await mongoose.connect(db.getUri("slotbay_demo"));
for (const model of Object.values(mongoose.models)) await model.init();
await seedDemo();
if (process.env.ADMIN_PASSWORD) await seedAdmin("admin@gmail.com", process.env.ADMIN_PASSWORD);
const server = createApp().listen(port, "127.0.0.1", () =>
  console.log(`Isolated demo preview: http://localhost:${port}`),
);
async function stop() {
  server.close();
  await mongoose.disconnect();
  await db.stop();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { settleElapsedBookings } from "./bookings.js";
import { deliverApprovalEmails } from "./email.js";
import { connectDatabase } from "./database.js";
await connectDatabase();
const server = createApp().listen(Number(process.env.PORT || 4000), () =>
  console.log(`SlotBay listening on port ${process.env.PORT || 4000}`),
);
let settling = false;
async function settle() {
  if (settling) return;
  settling = true;
  try {
    await settleElapsedBookings();
    await deliverApprovalEmails();
  } catch {
    console.error("Background processing failed; will retry");
  } finally {
    settling = false;
  }
}
void settle();
const timer = setInterval(settle, 60000);
timer.unref();
async function shutdown() {
  clearInterval(timer);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

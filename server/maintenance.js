import { settleElapsedBookings } from "./bookings.js";
import { deliverApprovalEmails } from "./email.js";

let running;
let lastRun = 0;

// Transactions and email leases protect work across instances. This guard only
// avoids duplicate work within one warm instance; it is not a global lock.
export function runMaintenance({ force = false } = {}) {
  if (running) return running;
  if (!force && Date.now() - lastRun < 60000) return Promise.resolve({ skipped: true });
  lastRun = Date.now();
  running = (async () => {
    await settleElapsedBookings({ limit: 25, deadline: Date.now() + 15000 });
    const email = await deliverApprovalEmails({ limit: 1 });
    return { status: "ok", email };
  })()
    .catch((error) => {
      lastRun = 0;
      throw error;
    })
    .finally(() => {
      running = undefined;
    });
  return running;
}

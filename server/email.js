import nodemailer from "nodemailer";
import { Auth, OwnerApplication, EmailJob } from "./models.js";

export function emailSettings() {
  const missing = ["SMTP_HOST", "MAIL_FROM", "SITE_URL"].filter((key) => !process.env[key]?.trim());
  if (process.env.SMTP_USER && !process.env.SMTP_PASSWORD) missing.push("SMTP_PASSWORD");
  if (missing.length) throw new Error(`Missing email settings: ${missing.join(", ")}`);
  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP_PORT must be a valid port number");
  const origin = new URL(process.env.SITE_URL);
  if (!["http:", "https:"].includes(origin.protocol))
    throw new Error("SITE_URL must be an HTTP or HTTPS website address");
  return {
    from: process.env.MAIL_FROM,
    origin: origin.origin,
    transport: {
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
        : {}),
    },
  };
}

export function createEmailTransport(settings = emailSettings()) {
  return nodemailer.createTransport(settings.transport);
}

// The worker is separate from approval: SMTP downtime must not undo a review.
// A lease prevents two server instances from delivering the same pending job at once.
export async function deliverApprovalEmails({ limit = 10 } = {}) {
  let settings;
  try {
    settings = emailSettings();
  } catch {
    return { configured: false, sent: 0 };
  }
  const transport = createEmailTransport(settings);
  let sent = 0;
  try {
    for (let count = 0; count < limit; count++) {
      const now = new Date();
      const job = await EmailJob.findOneAndUpdate(
        {
          status: "pending",
          next_attempt_at: { $lte: now },
          lease_until: { $lte: now },
        },
        { $set: { lease_until: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } },
        { new: true, sort: { next_attempt_at: 1 } },
      );
      if (!job) break;
      try {
        const account = await Auth.findOne({ _id: job.user_id, suspended: false });
        const approved = await OwnerApplication.exists({
          user_id: job.user_id,
          status: "approved",
        });
        if (!account || !approved) {
          await EmailJob.updateOne({ _id: job.id }, { $set: { status: "cancelled" } });
          continue;
        }
        await transport.sendMail({
          from: settings.from,
          to: account.email,
          messageId: `<slotbay-${job.id}@${new URL(settings.origin).hostname}>`,
          subject: "Your SlotBay owner account is approved",
          text: `Your owner documents have been reviewed and approved by the SlotBay administrator.\n\nSign in to add or manage your parking locations: ${settings.origin}/owner\n\nEach parking listing is reviewed before publication. Your approved identity details are locked; submit a profile change report if a correction is needed.\n\nThe SlotBay team`,
        });
        await EmailJob.updateOne(
          { _id: job.id },
          { $set: { status: "sent", sent_at: new Date() } },
        );
        sent++;
      } catch {
        await EmailJob.updateOne(
          { _id: job.id },
          {
            $set: {
              lease_until: new Date(0),
              next_attempt_at: new Date(
                Date.now() + Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10)),
              ),
            },
          },
        );
        console.error("Owner approval email delivery failed; queued for retry.");
      }
    }
  } finally {
    transport.close();
  }
  return { configured: true, sent };
}

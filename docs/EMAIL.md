# Owner approval emails

Password recovery, reset links and OTP recovery are intentionally absent from v3.2.

For owner approval notifications, use **Brevo Free**. Its official plan currently includes 300 emails per day and transactional email. Unused daily sends do not roll over. [Brevo plan details](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans).

1. Create your free Brevo account and verify a sender address you control. Complete sender/domain authentication and account activation requested by Brevo.
2. In Brevo's SMTP settings, copy the SMTP login and generate an SMTP key.
3. Set these values in the existing private project-root `.env`:

   ```dotenv
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-Brevo-SMTP-login
   SMTP_PASSWORD=your-Brevo-SMTP-key
   MAIL_FROM="SlotBay <your-verified-sender@example.com>"
   ```

   Replace the placeholders. Use the SMTP key, not an API key or account password. Keep `SITE_URL` set to the website users can open. [Official SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).
4. Run `npm run check:email` to check the connection and authentication without sending an email, then restart the API.

The server records an email job in the same MongoDB transaction as a new owner approval. Its background worker delivers queued jobs once per minute, retries temporary failures, and avoids queuing another message when an already-approved application is approved again. Rejected/suspended owners are skipped. In-app verification notifications remain available without SMTP.

No live sender or SMTP credentials are included. Actual inbox delivery has not been confirmed. Tests use a disposable local SMTP server, including a temporary rejection and retry. SMTP provides at-least-once delivery: a process failure after SMTP acceptance but before saving the delivery timestamp can cause a duplicate. Jobs use a stable Message-ID and a lease to reduce duplicates.

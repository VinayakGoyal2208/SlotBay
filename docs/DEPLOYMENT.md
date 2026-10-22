# ☁️ Host SlotBay for free

**Recommended for a project demo: Render Free Web Service + MongoDB Atlas Free.**

React and Express share one HTTPS address. Use Render's included `onrender.com` address without buying a domain. Policies checked on **19 October 2026**.

## 1. Upload to GitHub

Follow the [GitHub guide](GITHUB.md). Put the contents of `slotbay` at the repository root, with `package.json` at the top level. Include `public`, `docs` and `package-lock.json`; keep `.env` private.

## 2. Prepare MongoDB Atlas

Use your existing Atlas database, or create a **Free** cluster for a new demo. Verify the selected tier is Free before creating anything.

- Create a database user with access to the application's database.
- Save the connection URI privately as `MONGO_URI`, including the intended database name.
- Add the hosting service's outbound IP ranges to Atlas Network Access.
- Atlas supports the replica-set transactions SlotBay requires.
- For an existing database, reuse its exact `DATA_ENCRYPTION_KEY`. Do not generate a replacement.

The database is separate from Render. You do not need Render Postgres.

## 3. Create a Render Free Web Service

1. Sign in at [Render](https://render.com) and connect GitHub.
2. Choose **New → Web Service** and select SlotBay.
3. Choose **Node** as the runtime and **Free** as the instance type.

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root directory | Blank when `package.json` is at the repository root |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/v1/health` |
| Node version variable | `NODE_VERSION=24.x` |

If your repository contains a top-level `slotbay` folder instead, use `slotbay` as the root directory.

See [Render web services](https://render.com/docs/web-services) and [Node version settings](https://render.com/docs/node-version).

## 4. Add environment variables

Use Render's private environment settings:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | Private Atlas connection string |
| `DATA_ENCRYPTION_KEY` | Existing stable 64-character hex key |
| `SITE_URL` | Assigned public HTTPS origin |
| `VITE_SITE_URL` | The same public HTTPS origin, available during the build |

For example, use `https://your-service.onrender.com` for both URL variables, without a trailing slash. This is a placeholder, not an existing deployment. Rebuild after setting or changing `VITE_SITE_URL`.

Production requires HTTPS. Render supplies `PORT` automatically.

Set `TRUST_PROXY_HOPS` to the verified trusted proxy-hop count for the actual deployment. Recheck when adding another proxy/CDN; do not enable unrestricted proxy trust.

Keep credentials and encryption keys out of all `VITE_` variables.

## 5. Deploy and check

Click **Create Web Service**. After deployment:

- Open the website and `/api/v1/health`; the health response should be `{"status":"ok"}`.
- Test sign-in, search, direct parking links and booking.
- Check `/robots.txt` and `/sitemap.xml` while awake.

For a new database, seed the administrator **from your local computer** using that database's private environment settings and `npm run seed:admin`. Render Free has no shell access. Remove `ADMIN_PASSWORD` afterward. Existing administrators do not need reseeding.

Keep frontend and API under one public origin. Uploading only `dist` would omit the API, background jobs and dynamic SEO routes.

## ⚠️ Free-plan tradeoffs

| Limit | Effect |
| --- | --- |
| Sleeps after 15 minutes without incoming traffic | The next visit wakes it, typically taking about a minute. Background tasks wait during sleep. |
| 750 free instance hours per workspace/month | Shared between services; exhausting the allowance suspends free services until next month. |
| SMTP ports 25, 465 and 587 blocked | Current approval emails cannot send through the configured SMTP port. In-app notifications still work. |
| Sleeping robots.txt blocks crawlers | Suitable for a demo; no promise of strong SEO or instant first visits. |
| Bandwidth/build allowances | Quota exhaustion can suspend services or prevent new builds. |

Idle sleep does not delete the website address. Do not use artificial keep-alive traffic to work around tier limits. See [Render Free documentation](https://render.com/docs/free).

Approval emails on this tier require a server change to an HTTPS email-provider API instead of SMTP.

Atlas Free can separately pause after **30 days of database inactivity**. Resume it in Atlas when needed. See [Atlas pause policy](https://www.mongodb.com/docs/atlas/pause-terminate-cluster/).

## 🔗 About Vercel links

Vercel protects the current production deployment from retention deletion. Older preview URLs can be removed; share the production project domain or a custom domain. See [Vercel's retention update](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage).

SlotBay uses Express background timers, so Render's service model fits the current code with fewer changes than serverless hosting.

## Status

The local website has been checked. These instructions do not mean it has already been publicly deployed or cloud-tested.

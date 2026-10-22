> Updated in v3.2: password recovery is intentionally removed. See V3.2-CHANGES.md for current differences.

# Technical architecture

## Stack and boundaries

React 19, HTML5, JavaScript, Tailwind 4, Vite, TanStack Router/Query and lazy Leaflet form the browser client. Express 5 exposes versioned REST endpoints and serves the production HTML shell. Mongoose 8 connects to MongoDB. Node 24 also loads the shared JavaScript validation module on the server. Legacy PostgreSQL/Supabase/Nitro dependencies are removed from the active build.

The typed API adapter retains the original screen-level data shapes to preserve the design. Its familiar `from/select/update` calls become **allowlisted REST operations**, never arbitrary database queries. The server owns all role checks, ownership scopes, accepted fields, prices and state transitions. Client filters cannot expand the server's authorization scope.

## Collections

| Collection | Purpose |
| --- | --- |
| `auth` | One credential/account record per normalized email: salted scrypt hash, account type, suspension state. Hash excluded from normal projections. |
| `users`, `owners`, `admins` | Separate role-specific profiles, sharing the auth ID. No credentials here. |
| `email_jobs` | Owner approval mail queue, retry schedule and delivery timestamps. |
| `auth_sessions` | Hashed random session tokens with expiry and MongoDB TTL indexes. |
| `owner_applications` | Verification evidence references, status, bank/identity fields. ID number and bank account encrypted with AES-256-GCM. |
| `vehicles` | Driver vehicle compatibility, number, licence evidence and verification state. |
| `listings` | Capacity, vehicle types, city, coordinates, access times, gallery references, rental rules, pricing, publication and archive state. |
| `locations` | Linked geographic records with a 2dsphere index. Listing edits synchronize these records transactionally. |
| `bookings` | UTC intervals, India-local display fields, immutable quote/vehicle snapshot, status and idempotency key. |
| `listing_blocks` | Whole-day or partial-day owner closures. |
| `notifications`, `disputes` | In-app state-change messages and user-owned booking issues. |
| `uploads` | Encrypted file bytes, validated media type, size and owner-scoped logical path. Max 5 MB/file, 100 MB/account. |
| `payments` | Integer minor-unit amount, INR currency, provider identifiers and settlement state. Starts `not_collected`. |
| `pricing_guidelines`, `audit_events` | Optional city guidance and key administrative review/suspension events. |

MongoDB creates indexes at startup. Credentials remain centralized even when an owner application changes status. An owner role is derived from approved verification, not from an untrusted registration field. Public signup accepts only driver or owner account types.

## Reservation correctness

Every reservation, listing edit, block, cancellation and booking transition increments the listing revision inside a MongoDB transaction. Competing transactions write the same listing document; the driver retries against fresh state. Availability is recomputed inside the reservation transaction. This prevents overselling across multiple API processes, not just repeat clicks in one browser. A user-specific unique idempotency key prevents repeated delivery of the same request from creating another booking.

Capacity is the maximum simultaneous occupancy over the requested half-open interval, including pending and confirmed bookings. Back-to-back bookings do not overlap. Whole-day and partial closures, overnight opening hours, publication, archived state, owner verification and vehicle compatibility are checked on the server. Past or more-than-one-year-ahead arrival is rejected. Edits cannot reduce capacity, relocate the space, or narrow access incompatibly with existing active bookings. Archiving hides discovery while preserving history.

Prices are the lowest of hourly total, rounded-up daily total and the 30-day price cap. Currency is INR. The server stores the rates used in the quote; existing booking values do not change after a listing is edited. A payment row and both driver/owner notifications are inserted in the same transaction. No monetary collection is inferred from a confirmed reservation.

The settlement worker runs every minute, processes up to 500 elapsed bookings per pass, and uses the same listing lock. It is safe to run on multiple replicas, but large installations should move scheduling to a dedicated queue/worker and monitor backlog.

## Security controls

HttpOnly, SameSite=Lax cookies hold opaque session tokens; production uses Secure cookies. There is no localStorage credential token. Unsafe APIs require a custom request-verification header, JSON where appropriate, and an allowed Origin. No permissive CORS is configured. Express uses Helmet, payload limits, authentication throttling, ownership checks, validation and redacted error responses. Suspensions revoke sessions and unpublish owned listings.

Uploads are checked by content signatures, limited in size, encrypted, and served through short-lived signed bearer links. Only the uploader, an administrator, or visitors to a published listing can obtain appropriate links. Uploaded documents are sandboxed by response CSP. Client image dimension checks remain; server malware scanning and image re-encoding are future hardening steps. Links remain valid until expiry after issuance. Back up the encryption key separately from the database.

The administrator seed never overwrites accounts, bypasses verification, or embeds its password. Existing legacy `auth` records with different schemas need explicit migration. Restore and deletion policies for identity documents must be designed before accepting real personal data at scale.

## Performance and expansion

Public search uses indexed text, vehicle, city and geospatial filters with pages of 60 listings. Public galleries resolve file metadata in a batch; interval availability loads relevant bookings and blocks in bulk. API list pages cap at 200 rows. Current dashboard screens retrieve pages through the adapter; very large accounts should move to virtualized server-filtered tables instead of loading all history (adapter ceiling: 20,000 rows). Reports aggregate on the server. Geospatial text combination uses a bounded nearby query and escaped text filter.

React routes and Leaflet are split into separate chunks; images retain lazy loading; the original CSS/IntersectionObserver story and reduced-motion styles remain. Express compresses responses and caches hashed static assets for a year. Performance under 3 seconds is a target, not a measured production guarantee. The main initial JS bundle is approximately 138 KB gzip before later route chunks. The original large cinematic PNG assets are preserved, so slow-network asset optimization remains useful.

Rate limiting is process-local; deploy a shared limiter/store before horizontally scaling. MongoDB is currently also the upload store; a private object-storage adapter and signed CDN URLs are recommended for larger photo libraries. Add queue-based notification delivery, monitoring, backups, structured audit retention and restore drills before a public high-traffic rollout.

## SEO and accessibility

Express returns canonical, Open Graph, Twitter and structured metadata in the initial HTML and correct 404 status for unknown/unpublished pages. Private routes use noindex; robots excludes account/API routes; sitemap includes only published public pages. Client route metadata updates on navigation. This remains a React SPA for page content, not full server rendering; non-JavaScript crawlers receive metadata but not the full React body. The deployment domain must be configured accurately.

Native form associations, inline error descriptions, skip navigation, mobile menu state, keyboard controls, map links and reduced-motion support are retained or improved. Complete assistive-technology certification and production content review are outside the automated checks.

Reference design decisions follow [Express security guidance](https://expressjs.com/en/advanced/best-practice-security.html), [Mongoose transaction guidance](https://mongoosejs.com/docs/8.x/docs/transactions.html), and [TanStack head management](https://tanstack.dev/router/latest/docs/guide/document-head-management). Transaction operations run sequentially within each session.

## v3 identity and correction records

`identity_claims` stores unique HMAC keys for phone/plate/licence and owner identities, linked to auth IDs. Existing profiles and vehicle records are checked before a claim; concurrent registrations serialize on the unique claim. Historical claims remain reserved after a correction. DATA_ENCRYPTION_KEY must remain stable; rotating it requires a planned encrypted-data and claim migration.

`change_requests` stores proposed corrections and administrator decisions. Sensitive owner values are encrypted at rest. Only the requesting account and admins can read requests. Approval checks document ownership, uniqueness and active reservations, then atomically applies the update, audit record and notification.

All schemas have created_at/updated_at timestamps. Owner review and correction resolution add explicit decision dates. Legacy missing dates are not invented. New booking arrival details are snapshotted. Capacity-only edits use the same listing revision lock as bookings/blocks and retain publication.

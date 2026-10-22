> Updated in v3.2: password recovery is intentionally removed. See V3.2-CHANGES.md for current differences.

# REST API v1

Base: `/api/v1`. Responses are JSON unless serving file bytes. Errors use `{ "message": "..." }`; validation 400, unauthenticated 401, unauthorized 403, missing 404, conflict 409. Requests never accept MongoDB operators or role mutations. Cookie authentication is same-origin. Send `X-SlotBay-Request: 1` with unsafe requests and JSON content type except binary uploads.

| Method/path | Access and behavior |
| --- | --- |
| GET `/health` | Database readiness. |
| POST `/auth/register` | Email, password, full_name, phone, account_type=user/owner. Atomic auth/profile creation. |
| POST `/auth/login`, `/auth/logout` | Opaque HttpOnly session cookie; generic login failures. |
| GET `/auth/session` | Current safe user identity or null. |
| GET `/search` | Public q/city/vehicle/lat/lng/page; returns `{data,hasMore,page}`. Radius 10 km for coordinates, max 60 rows/page. |
| GET `/spaces/:id` | One verified, unarchived listing with signed gallery links. |
| GET `/availability` | date, start, hours, optional comma-separated ids; live interval capacity. Date/time interpreted in India. Up to 100 IDs. |
| GET `/profiles`, `/user-roles` | Own profile/derived roles; admin profiles view is platform-wide. |
| PATCH `/profiles/:authId` | Own name/phone; administrator suspension controls; cannot elevate roles. |
| GET/POST `/owner-applications` | Own submission or admin review list. Encrypted fields only decrypted for authorized readers. |
| PATCH `/owner-applications/:authId` | Owner resubmission or admin status/reason. |
| GET/POST `/driver-details` | Own vehicle/licence submission or administrator list. |
| PATCH `/driver-details/:authId` | Admin restriction/restoration with a required rejection reason. Normal driver activation is immediate. |
| GET/POST `/listings` | Owner's inventory or admin's inventory; only approved owners create. |
| PATCH `/listings/:id` | Owner controls/details; admin publication/archive. Content changes reset review. |
| GET/POST `/listing-blocks` | Authorized listing owner; block cannot overlap an active reservation. |
| DELETE `/listing-blocks/:id` | Remove own block (or admin). |
| GET/POST `/bookings` | Own driver/owner scope or admin monitoring. POST requires `Idempotency-Key` (16–100 characters). |
| PATCH `/bookings/:id` | Authorized transition to Confirmed, Declined, Cancelled or Completed; time/state checks enforced. |
| GET `/notifications`; PATCH `/notifications/:id` | Personal inbox and mark-read. |
| GET/POST `/disputes`; PATCH `/disputes/:id` | Driver reports against own booking; admin resolves. |
| GET/POST `/pricing-guidelines` | Authenticated read; administrator city guideline upsert. |
| GET `/reports` | Admin aggregate users/owners/bays/bookings/hours/reservation value/collected revenue/utilization. |
| POST `/files/upload?bucket=...&path=...` | Authenticated raw file bytes. documents or listing-photos, caller ID prefix, max 5 MB. |
| GET `/files/signed?bucket=...&path=...` | Authorizes and issues 10-minute link. |
| GET `/files/content/:id?expires=...&signature=...` | Valid signed link; encrypted bytes decrypted server-side. |

Resource list reads accept allowlisted `id`, `user_id`, `owner_id`, `listing_id`, `listing_ids`, `verified`, `archived`, `city`, `sort`, `direction`, `page`, `limit`. Server ownership scope is always intersected with those filters. Historical bookings include safe listing title/area/image-key summaries, even if archived.

Example reservation body:

```json
{"listing_id":"listing-uuid","booking_date":"2030-01-10","start_time":"09:00","hours":2,"vehicle":"4W","plate":"KA01AB1234"}
```

The authenticated driver must have a matching, non-restricted vehicle with licence and RC documents. No administrator approval wait is required. Amount, status, code, user ID and price snapshot are determined on the server; submitting arbitrary price/status fields is rejected. The optional user_id must equal the authenticated ID. Reuse the same idempotency key when retrying the identical reservation after a connection failure.

There is no public endpoint to mark payments paid. Add a dedicated provider adapter and signature-verified idempotent webhooks before online payment deployment.

## v3 endpoints and policy

- Registration requires driver `vehicle: {vehicle_type, plate, licence_number}` and immediately locks profile/identity fields. Mobile, vehicle and licence claims are unique across accounts.
- POST `/driver-details` allows initial document completion with `licence_path` and `rc_path`, then locks those references. Direct replacement is forbidden.
- PATCH `/listings/:id` with only `{ "total": 4 }` adjusts owner capacity without unpublishing. Range 1–500, with transactional checks against peak occupancy of existing reservations.
- GET/POST `/change-requests`: own requests, or all requests for admins. Creation accepts `{category: "profile" | "vehicle" | "owner", message, proposed}` with strict category fields and private upload references.
- PATCH `/change-requests/:id`: admin only; `{status: "Approved" | "Rejected", admin_note}`. Approval applies changes atomically, rechecks uniqueness and existing bookings, and records an audit event and notification.
- Booking responses include a scoped arrival snapshot with name, phone, licence suffix, document reminders and the full parking address. Owners do not receive private licence/RC file access.
- GET `/search?q=...` matches partial text and provides an opaque `host_id` for grouping. Query text is escaped and bounded.
- New bookings always confirm when a bay is available; disabling automatic confirmation is rejected.

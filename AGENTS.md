# SlotBay maintenance instructions

Preserve original visual content, CSS/IntersectionObserver scroll journey, deterministic car path, cursor-following sign-in companions, reduced-motion support and lazy OpenStreetMap rendering.

The React/Tailwind frontend calls the versioned Express API. MongoDB is authoritative. Never restore browser-direct database access or trust client roles, prices, ownership or booking status. Every listing-affecting booking/block/edit must serialize through the listing revision in a transaction. Use a MongoDB replica set.

Keep credentials only in auth and separate user/owner/admin profiles. Keep secrets server-only and out of archives. Never seed a plaintext default password. Owner publication follows verified applications; substantive edits and restores require review. Archive listings to preserve history. Use Asia/Kolkata booking time semantics.

Maintain reference-based action locks for asynchronous writes. Validate documents server-side and issue short-lived authorized links. Use correct per-route canonical/noindex metadata and configured public origin. Run build, lint, unit and integration tests after functional changes. Password recovery is intentionally absent. Owner approval emails use the transactional email queue.

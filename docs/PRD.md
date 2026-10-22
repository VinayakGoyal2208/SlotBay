> Updated in v3.2: password recovery is intentionally removed. See V3.2-CHANGES.md for current differences.

# Smart Parking Slot Rental & Availability Platform — PRD

## Purpose and audience

SlotBay connects drivers to unused private parking near metro stations, offices and commercial areas. It helps owners earn from spare capacity and gives administrators a verified inventory and booking oversight. The existing Bengaluru launch positioning remains; listings carry city and geospatial data for expansion.

## Phase 1 scope

Responsive desktop/mobile web only. Search by destination, date, arrival time, duration and two-/four-wheeler type; map-centric discovery; verified listing details, addresses, access windows, vehicle compatibility, sizes, rates and rules; immediately confirmed reservations when capacity is available; personal history and notifications. Owners submit verification evidence, create and manage galleries/listings/capacity, set prices and rules, adjust available bay capacity, block dates and review estimated earnings/history. Admins verify and suspend accounts, publish/archive locations, review bookings/disputes, set advisory prices and export reports.

Native mobile apps, IoT occupancy, barrier control, automated vehicle admission, dynamic pricing and transit integrations remain outside Phase 1. Online collection is future work; the payment ledger is prepared without charging users.

## Acceptance criteria

1. A driver can register, submit driving licence and RC evidence, search and reserve compatible space for a valid future interval. Full spaces and closures cannot be booked even through direct API calls.
2. Only approved owner accounts can create listings. Public discovery only contains verified, active inventory. Editing substantive details resets verification; history survives archives.
3. New reservations confirm immediately when capacity permits; only the driver or an admin can cancel a future reservation. Ended confirmed reservations complete automatically. Legacy pending requests may still be resolved by their owner and expire at arrival.
4. Eight concurrent requests for the last bay must produce one accepted booking. Adjacent reservations must not conflict, and overlapping capacity must be evaluated throughout the stay.
5. Server pricing is independent of browser values. Driver and owner receive persistent in-app status messages. Disputes are tied to the driver's own booking.
6. User, owner and admin profiles are separate collections. Password hashes exist centrally in auth; role checks and suspension enforcement run server-side. No client MongoDB URI or admin password.
7. All existing guide content, imagery, scroll journey, desktop cursor animation and responsive visual language are preserved. Mobile sign-in intentionally shows only the form. Keyboard labels and reduced-motion behavior remain usable.
8. Public metadata reflects the deployment domain. Private pages are noindex. Unknown routes return 404; published spaces appear in the sitemap.

## KPIs and interpretation

Report registered drivers/owners, listed bays/locations, booking counts by state, reserved hours, completed reservation value, collected payment revenue and approximate 30-day booked utilization. Utilization uses current listed capacity as its denominator and is not physical occupancy. Conversion and reduced parking search time need consented analytics and a baseline; they are explicitly unmeasured. Under-three-second search/booking is a performance target to validate in the final hosting region and traffic profile.

## Operational assumptions

Owners provide accurate listings and availability. Users comply with booking windows. Human admins verify documents and handle disputes. SlotBay acts as intermediary. A real deployment needs privacy/retention policies, trained reviewers, secure secret management, SMTP, backups, monitoring and a support process. Payment capture, refunds and payouts require a separate provider integration.

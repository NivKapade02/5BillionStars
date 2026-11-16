# Firebase Spark deployment

The Angular application uses Firebase Authentication and Cloud Firestore directly.
No Node server, SQLite database, Cloud Run or billing upgrade is required for this flow.
The optional server/ API is a separate legacy implementation and is not used by the website.

## Console setup

Project: billionstars-5077e. Stay on the Spark plan.
Create the (default) Firestore database in Standard edition, production mode.
Enable Authentication > Sign-in method > Email/Password.
The designated admin UID is paQi4R2liKhkGCch2RbDNCDSXuA3.
Sign in with that Firebase user's email/password, not the legacy server .env credentials.
If using a custom domain, add it under Authentication > Settings > Authorized domains.

Public web configuration is in src/app/firebase-client.ts. It is not a secret.
Never put admin passwords, service account keys or WhatsApp access tokens in Angular files.

## Build and deploy

```powershell
npm install
npm run build
npx --yes --package firebase-tools firebase login
npx --yes --package firebase-tools firebase deploy --only firestore:rules,hosting --project billionstars-5077e
```

Deploy firestore.rules along with Hosting. Production mode alone blocks new requests.
Do not change the rules to allow public reads. Guests can create a validated pending
request or repeat an identical write; only the designated admin can read bookings
and update decisions. Original estimates are saved with each request and checked against the stay rates,
night count, guest counts and 40% advance formula by Security Rules. When changing
stay prices, update the matching constants in firestore.rules as well as stay-pricing.ts.
Guest writes use the UUID request reference as document ID to prevent duplicate retries.
A new request's device clock must be within 15 minutes behind / 5 minutes ahead of server time.

## Verify

Submit a valid request on /book. The WhatsApp link appears only after Firestore
acknowledges the write. The guest still opens WhatsApp and taps Send manually.
In Firestore > Data, inspect bookingRequests. Sign in at /admin/login and check
Booking Requests; an open dashboard updates through a live Firestore listener.
Refresh /admin to verify session restoration. Confirm or decline a request, then
reload and verify the saved decision. Test guest access with `npm run test:firestore` (requires Java 21+ for the local emulator).

Existing local SQLite records are not migrated automatically. Visitor analytics
and leads in the dashboard remain sample data. No payment verification is automated.
Watch Firestore Usage in the console to stay within Spark quotas; only the newest
1,000 bookings are listened to by the admin dashboard. Public submissions need no
customer account; Firebase App Check can be added separately to reduce automated abuse.

## Edit and delete booking requests

The Actions column lets the designated admin edit guest details, stay dates,
counts and comments, or delete a request after confirmation. Editing recalculates
the quote at current rates and resets the decision to pending; reference and
submission time remain unchanged. Rules validate edited counts and estimates.
Deploy both Firestore rules and Hosting to enable these actions. Guest and
non-admin users cannot modify or delete booking records.

## Live reporting and site activity

The dashboard has no sample visitor/lead/chart data. Visitors, device mix,
referrer domains, page paths, language, browser time zones and WhatsApp/phone link
opens come from usageEvents. Lead rows come from actual bookingRequests.
Follow-up status and notes persist on each booking. Admin payment records are
manually verified totals, not automatic bank or WhatsApp confirmation.

New collections require the updated firestore.rules deployment. No extra sign-in
provider, Cloud Function or billing upgrade is required. Usage events allow only
validated creates; only admin can read them. Public users cannot change or delete
events. Every admin booking edit, decision, deletion, payment record and follow-up
is committed atomically with an append-only adminActivity entry.

Tracking runs only on public routes and respects Do Not Track, Global Privacy
Control and the footer opt-out. It uses random browser/session IDs in browser
storage; blocked storage disables optional tracking without blocking bookings.
Referrers include only domains, and paths exclude query strings. No IP addresses,
message contents, GPS coordinates or inferred cities are collected. Time zones
are browser settings rather than verified locations. Heartbeats run every two
minutes while a tab is visible. Recent sessions means activity in the last three
minutes, not guaranteed online presence. Tab closure and WhatsApp delivery cannot
be observed reliably. Returning browser counts depend on retained browser storage.

Dashboard listeners load at most 1,000 bookings, 2,000 usage events within 90 days,
and 100 admin actions. Filters and totals operate on that loaded window. They are
not lifetime totals; a busy site can hit limits sooner. The 90-day query does not
delete stored history. Monitor Firestore Usage and storage in the console and
remove old data through a trusted admin maintenance process when needed. Browser
telemetry is a client-reported signal and can be blocked or spoofed; App Check can
be added separately. Each event consumes a write and live listeners consume reads.
Print / Save PDF prints the current dashboard view and page; CSV exports all
filtered loaded rows. Usage time-series and 'today' use India calendar dates.

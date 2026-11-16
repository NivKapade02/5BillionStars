# 5 Billion Stars campsite website

Angular website with WhatsApp booking requests and a private admin booking table.
The deployed Spark flow uses Firestore for booking storage, Firebase Authentication
for the designated admin, and realtime Firestore updates for Booking Requests.
Visitors and charts use recorded browser events. Booking leads, follow-up, manual payment records, and admin audit history update live. The guest must still tap Send in WhatsApp; bank payments and message delivery are not verified automatically.

See [Firebase Spark setup and deployment](docs/firebase-deployment.md) for console
setup, Security Rules, deployment commands and verification.

```powershell
npm install
npm start
npm run build
```

Firebase web config is in `src/app/firebase-client.ts`. Admin passwords belong in
Firebase Authentication, never in frontend files. Deploy `firestore.rules` before
using the form. The browser does not use `/api` or the local `.env`.

The optional legacy SQLite API remains under `server/` and can be run separately
with Node 24+, a server-only `.env`, and `npm run start:server`. Its local records
are separate from Firestore. Its tests run with `npm run test:server`.

# 5 Billion Stars campsite website

Angular website with a WhatsApp booking request form. Book Now and the floating WhatsApp button open the form on the homepage; `/book` also works directly.

The form validates stay dates, contact numbers, guest totals and meal counts, and calculates an estimate using tent ₹999/adult/night, cottage ₹1499/adult/night and children 5–10 ₹700/night. Children under 5 are free. Meals and taxes are included. The displayed 40% advance is an estimate to discuss with the team before payment.

Submitting prepares a message containing all entered details and the estimate. The guest clicks **Open booking request in WhatsApp** and taps **Send** to contact +91 8624908808. Opening WhatsApp does not confirm sending, delivery, availability, payment or a reservation. The team confirms availability, the final quote and payment instructions manually in WhatsApp; guests attach payment screenshots directly in that conversation.

Firebase Authentication, the admin dashboard, Google Sheets/Drive integration, guest recovery links and receipt uploads have been removed. The form does not send data to a booking backend or save personal details in browser storage. Existing Google Sheet/Drive records and remote deployments are not deleted by this code change. Disable the old Apps Script web app separately if no longer needed; keep historical records as appropriate.

Firebase Hosting configuration is retained for publishing the static website. It does not require the Firebase JavaScript SDK or Google admin sign-in in the website. The old `/admin` route redirects home and old `/booking/:id` links redirect to the request form.

## Development and verification

```powershell
npm install
npm start
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Publish `dist/5-billion-stars/browser`; see [Firebase Hosting deployment](docs/firebase-deployment.md). This change does not deploy automatically. The optional legacy Node server in `server/` is not used by the static booking form.

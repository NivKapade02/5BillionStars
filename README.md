# 5 Billion Stars � HTML booking form, WhatsApp and Google Sheets

The original camping website is at `/`. Its Book Now and floating WhatsApp buttons open a booking dialog on the same homepage. The form collects the visitor WhatsApp number and saves the booking to your Google Sheet, then opens a WhatsApp message addressed to **+91 8624908808** with the guest's name, phone, stay dates, guest count, special requests and booking reference. The customer must tap **Send** in WhatsApp. Opening the message cannot prove that it was sent or delivered.

Existing direct links to `/book` also work, but homepage booking buttons do not navigate away. The active form runs on static hosting and does not require a Meta Business API token, approved message template, or Node booking server.

The booking dialog follows the reference form: welcome banner, required first and last names side by side, required date of birth (today or earlier), WhatsApp and alternate mobile numbers side by side with country flags and selectors, required email, check-in/out dates, member count, adult/kid counts, veg/non-veg counts and optional comments. Adult plus kid counts and veg plus non-veg counts must each match the member count. At least one adult is required. Comments allow 200 characters and email allows 100 characters.

All new details appear in the WhatsApp message. For compatibility with the already-deployed Apps Script, alternate mobile, email, date of birth, adult/kid counts, meal counts and comments are also saved together in the existing **Special requests** column (within its 500-character limit). The current form update requires no Apps Script redeployment. The banner is the image from the user-provided WhatsForm reference.

The homepage Stay Options section offers Tent Stay (2-3 people) and Cottage Stay (4-5 people). Each card opens the existing booking dialog with that choice, which is included in WhatsApp and in the sheet Special requests column. Capacities describe each accommodation; availability is confirmed by the campsite.

## Connect your Google Sheet (one-time setup)

Your sheet: [5 Billion Stars booking sheet](https://docs.google.com/spreadsheets/d/1eZL2JO06jmQ45FPfFSX6E1Kk6IQ7MOb_W3QKZQYoP0E/edit).

1. Open the sheet with an account that can edit it. Choose **Extensions ? Apps Script**.
2. Paste the contents of `google-apps-script/Code.gs` into the script editor and save. The script already targets the sheet you provided.
3. Select **setupBookingSheet** in the function dropdown and click **Run**. Authorize access when Google prompts. It creates a `Bookings` tab and its headers without changing existing tabs.
4. Choose **Deploy ? New deployment ? Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. Your Google Workspace administrator may restrict anonymous web apps.
5. Copy the deployed **Web app URL ending in `/exec`**. The spreadsheet's `/edit` URL and the Apps Script `/dev` test URL are not submission endpoints.
6. Paste the URL into `googleSheetsWebAppUrl` in `public/booking-config.json`. Leave the WhatsApp number as digits including country code. This file is public configuration; never put tokens or Google passwords in it.
7. Run `npm start` for local development. Run `npm run build` for hosting, then publish `dist/5-billion-stars/browser`. Configure your host to serve `index.html` for `/book`.

Example configuration:

```json
{
  "whatsappNumber": "918624908808",
  "googleSheetsWebAppUrl": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
}
```

After editing the Apps Script code later, update the deployment to a new version through **Deploy ? Manage deployments**. Saving code alone does not update a versioned `/exec` deployment.

## What happens on Submit

1. The form validates the required details, stay dates and guest count.
2. A request reference is generated, and the form sends the booking to Apps Script.
3. Apps Script validates it again, locks the sheet to prevent simultaneous duplicate inserts, and appends the booking. Text that could be interpreted as a spreadsheet formula is stored as literal text.
4. The browser waits for an explicit `{ "ok": true, "id": "matching-reference" }` response before opening WhatsApp. It never treats a `no-cors` opaque response as a confirmed save.
5. WhatsApp opens with the completed message. The customer taps **Send**. A visible link remains available if the browser blocks the new tab or the customer closes it.

When saving fails or times out, the details stay in the form. Retrying unchanged details in the same page reuses the reference to avoid duplicate rows, including when Google saved the row but the response was lost. Reloading the page starts a new reference. The sheet records the booking request even if the customer chooses not to send the WhatsApp message. Availability remains subject to confirmation by the campsite.

The sheet integration is intentionally write-only for visitors. Keep the sheet itself private; public editing or publishing the sheet is not necessary. The Apps Script endpoint is public to accept guest bookings; it does not authenticate guests or provide spam prevention. Apps Script quotas and account restrictions apply. If Google blocks the cross-origin response for your deployment or browser, the form reports an unconfirmed save rather than claiming success; inspect the sheet and deployment settings and retry with the same page reference.

## Verification

Use Node.js 24 or later for the included tests/build tools.

- `npm run test:sheets`: Apps Script behavior with simulated Google services: validation, row contents, duplicates, literal formula handling and configuration errors.
- `npm test -- --watch=false --browsers=ChromeHeadless`: browser unit tests for save-before-WhatsApp, failures, encoded messages, fallback links and validation.
- `npm run build`: production Angular build.

For a live check after deployment:

1. Submit a booking with an identifiable test note.
2. Verify exactly one row with all details appears in the `Bookings` tab.
3. Check that WhatsApp opens a chat with +91 8624908808 and the same reference and details.
4. Tap Send and verify receipt on the admin phone.
5. Verify a failed submission shows an error and offers retry. In a browser that blocks popups, verify the visible Open booking in WhatsApp link works.

Live Google Sheets saving and same-reference retry were verified on 1 November 2026 using the configured deployment. The test row is labelled WEBSITE INTEGRATION TEST - IGNORE (reference ebbf870e-ca0c-4249-bf7a-6b2559ff50bc). Actual receipt on the admin WhatsApp phone still requires the customer to tap Send and the admin to verify the message.

## Earlier API implementation

`server/`, `.env.example`, `proxy.conf.json` and the `start:server` / `test:server` commands retain the earlier optional Meta API implementation. The HTML booking form no longer calls that API. Its database and private `.env` configuration are not required for this Google Sheets and WhatsApp handoff flow.

References: [Google Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Content Service and redirects](https://developers.google.com/apps-script/guides/content), [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934).




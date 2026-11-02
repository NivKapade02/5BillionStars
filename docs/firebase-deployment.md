# Firebase Hosting deployment

firebase.json publishes only dist/5-billion-stars/browser and rewrites Angular
routes to index.html. It does not upload .env, server files, or booking records.
The existing booking flow uses the deployed Google Apps Script endpoint and
visitor-sent WhatsApp messages; the optional Node server is not hosted here.

The globally installed Firebase CLI was incomplete. Use the temporary npm CLI:

```powershell
npx --yes --package firebase-tools firebase login --reauth
npx --yes --package firebase-tools firebase projects:list
npm run build
npx --yes --package firebase-tools firebase deploy --only hosting --project YOUR_PROJECT_ID
```

Complete Google sign-in in your own terminal/browser. Do not share authorization
codes or access tokens in chat. Deployment is pending renewed authentication;
the saved login returned HTTP 401 during project discovery.

After deployment, check the homepage, /book, booking-config.json, gallery images
and videos. Record the actual Hosting URL after the CLI reports success. Do not
mark deployment successful based on a local build alone.

Deployed successfully to project billionstars-5077e on 1 November 2026.
Hosting URL: https://billionstars-5077e.web.app


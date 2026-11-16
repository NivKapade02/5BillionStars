> Implementation note: The current Spark deployment uses Firebase browser SDKs, Firebase Authentication and Security Rules. Visitor reports use optional browser events and time zones; IP addresses and exact cities are not collected. Leads come from bookings, and payments are entered by the admin. The original proposal below is not a description of live metrics.

# 5 Billion Stars Admin Dashboard Specification

## 1. Architecture Overview

- Frontend: Angular 19+
- Backend/API: Node.js + Express
- Database: Firebase Firestore
- Auth: Firebase Authentication with admin roles
- Hosting: Firebase Hosting
- Charts: Chart.js
- Visitor geolocation: IP geolocation and browser detection
- Notifications: in-app toasts + Firestore listeners

## 2. Firestore Collections

### visitors
```json
{
  "visitorId": "string",
  "sessionId": "string",
  "dateTime": "timestamp",
  "ipAddress": "string | null",
  "country": "string",
  "state": "string",
  "city": "string",
  "deviceType": "Mobile | Desktop | Tablet",
  "browser": "string",
  "os": "string",
  "referralSource": "string",
  "landingPage": "string",
  "sessionDurationSeconds": 342,
  "pagesVisited": 5,
  "isReturningVisitor": false,
  "userAgent": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### leads
```json
{
  "leadId": "string",
  "name": "string",
  "mobile": "string",
  "email": "string",
  "city": "string",
  "interest": "string",
  "source": "website | whatsapp | calling",
  "whatsappClicked": true,
  "submittedAt": "timestamp",
  "status": "Pending | Approved | Rejected",
  "approvalTimestamp": "timestamp | null",
  "approvedBy": "string | null",
  "notes": "string | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### analytics_daily
```json
{
  "date": "YYYY-MM-DD",
  "totalVisitors": 123,
  "uniqueVisitors": 98,
  "mobileVisitors": 72,
  "desktopVisitors": 41,
  "tabletVisitors": 10,
  "leadsGenerated": 8,
  "whatsappClicks": 5,
  "approvedLeads": 2
}
```

### analytics_locations
```json
{
  "country": "India",
  "state": "Rajasthan",
  "city": "Jaipur",
  "visitorCount": 182,
  "lastUpdated": "timestamp"
}
```

### admin_users
```json
{
  "uid": "string",
  "email": "string",
  "name": "string",
  "role": "super_admin | manager | viewer",
  "createdAt": "timestamp",
  "lastLoginAt": "timestamp"
}
```

### notifications
```json
{
  "notificationId": "string",
  "type": "new_lead | whatsapp_conversion | visitor_spike",
  "title": "string",
  "message": "string",
  "read": false,
  "createdAt": "timestamp"
}
```

## 3. Database Relationships

- `visitors` stores all sessions
- `leads` references each enquiry or WhatsApp lead
- `analytics_daily` aggregates data by date for charts and KPI cards
- `analytics_locations` aggregates geography data for world/India map highlight
- `admin_users` controls access and approval rights

## 4. API Endpoints

### Visitor APIs
- `GET /api/admin/visitors?country=India&state=Rajasthan&city=Jaipur&device=Mobile`
- `POST /api/track/visit`
- `GET /api/admin/visitors/export`

### Lead APIs
- `GET /api/admin/leads`
- `POST /api/lead/create`
- `PATCH /api/admin/leads/:id/approve`
- `GET /api/admin/leads/export`

### Dashboard APIs
- `GET /api/admin/stats`
- `GET /api/admin/analytics/visitor-trends`
- `GET /api/admin/analytics/location`
- `GET /api/admin/analytics/device-breakdown`
- `GET /api/admin/analytics/lead-trends`

### Auth APIs
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

## 5. Frontend Components

- `AdminLoginComponent`
- `AdminDashboardComponent`
- `AdminSidebarComponent`
- `OverviewStatsCardComponent`
- `VisitorAnalyticsComponent`
- `LeadManagementComponent`
- `ApprovedLeadsComponent`
- `GeoMapComponent`
- `SettingsComponent`

## 6. Chart Configuration

### Visitor Trends (Line Chart)
```ts
{
  type: 'line',
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{
    label: 'Visitors',
    data: [120, 140, 165, 150, 210, 240, 260],
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    tension: 0.35,
    fill: true
  }]
}
```

### Device Analytics (Doughnut)
```ts
{
  type: 'doughnut',
  labels: ['Mobile', 'Desktop', 'Tablet'],
  datasets: [{ data: [62, 31, 7], backgroundColor: ['#22c55e', '#60a5fa', '#fbbf24'] }]
}
```

### Lead Status (Doughnut)
```ts
{
  type: 'doughnut',
  labels: ['Approved', 'Pending'],
  datasets: [{ data: [3, 3], backgroundColor: ['#34d399', '#fbbf24'] }]
}
```

## 7. KPI Card Definitions

- Total Visitors
- Today's Visitors
- Unique Visitors
- Total Leads
- Approved Leads
- WhatsApp Clicks
- Conversion Rate
- Top Location
- Returning Visitors

## 8. Security Controls

- Firebase Authentication required for all admin access
- Firestore rules restrict read/write to admin user UID
- Admin-only endpoints verify Firebase ID token
- Role-based access checks on manager and viewer roles
- HTTPS required for public traffic and backend
- Sensitive visitor IP data masked unless explicitly approved for compliance

## 9. Sample Dashboard Mockup

```
┌──────────────────────────────────────────────────────────────┐
│ 5 Billion Stars       Overview  Visitors  Leads  Geo  Settings │
├──────────────────────────────────────────────────────────────┤
│ KPI cards: Total Visitors  Tot Leads  Conversion etc.        │
│ Visitor trend chart      Device mix chart                     │
│ Location chart          Lead analytics chart                  │
│ Visitor table            Lead table                           │
│ Approved leads table                                     │
└──────────────────────────────────────────────────────────────┘
```

## 10. Example Data Set

```json
{
  "visitorId": "V-1042",
  "country": "India",
  "state": "Rajasthan",
  "city": "Jaipur",
  "deviceType": "Mobile",
  "browser": "Chrome",
  "pagesVisited": 7,
  "sessionDurationSeconds": 432
}
```

```json
{
  "leadId": "LD-204",
  "name": "Amit Sharma",
  "mobile": "+91 98765 43210",
  "city": "Jaipur",
  "interest": "Family Camp Package",
  "whatsappClicked": true,
  "status": "Pending"
}
```

## 11. Implementation Notes

- Use a backend service to detect and store visitor metadata on first page load.
- Trigger lead creation when form submission completes and a WhatsApp CTA click occurs.
- Use Firestore realtime listeners for live updates and notifications.
- Export CSV using XLSX and PDF via jsPDF or browser print for report export.
- Keep the dashboard responsive using CSS grid and media queries.

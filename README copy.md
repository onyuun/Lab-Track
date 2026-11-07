# LabTrack frontend

LabTrack is a responsive frontend prototype for a laboratory equipment borrowing and management system. It is intentionally running in **mock mode** for this phase so the complete user experience can be reviewed before connecting Supabase.

## Run locally

From this directory:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

For the dedicated mobile-first entry point, open `http://localhost:4173/mobile.html`. It shares the same mock data and interaction logic as the desktop-responsive entry point, but uses a compact top bar, one-handed spacing, touch-sized controls, and a fixed bottom navigation dock.

Because the app uses native ES modules, use a local web server instead of opening `index.html` directly from the filesystem.

## Demo roles

The login screen has three one-click demo sessions:

- **Student** — Alex Rivera · `alex.rivera@campus.edu`
- **Faculty** — Dr. Maya Chen · `maya.chen@campus.edu`
- **Laboratory Personnel** — Jordan Lee · `jordan.lee@campus.edu`

The role switcher in the demo login is only for frontend preview. Supabase Auth + profile/RLS enforcement should replace it in the backend phase.

## Included frontend flows

- Login and registration surface for Students/Faculty.
- Requester dashboard with due-soon and overdue alerts, active borrowings, pending requests, and quick search.
- Equipment catalog with keyword, category, and availability filters.
- Equipment detail modal with availability indicator and request CTA.
- New request form with quantity validation against current available units.
- My Requests with status timelines, rejection reason, and cancellation for pending requests.
- Borrowing history and notifications.
- Staff dashboard with operational metrics and equipment health chart.
- Staff request queue with approve/reject interactions.
- Equipment management table with add, edit, archive interactions.
- Release and return processing with condition capture.
- Overdue monitoring, records with CSV export, condition log, and incident reporting surface.
- Responsive desktop sidebar and mobile bottom navigation.

## Page-by-page file organization

The project now follows a class-project style layout with one HTML entry file and one page-specific CSS file per screen:

```text
labtrack-ui/
├── index.html                 # primary responsive entry
├── mobile.html                # dedicated mobile-first entry
├── styles.css                 # shared design system and components
├── app.js                     # shared mock state and interactions
├── supabase-adapter.js        # future backend boundary
├── pages/
│   ├── login_page.html
│   ├── student_dashboard_page.html
│   ├── equipment_catalog_page.html
│   ├── new_request_page.html
│   ├── my_requests_page.html
│   ├── my_history_page.html
│   ├── notifications_page.html
│   ├── staff_dashboard_page.html
│   ├── request_queue_page.html
│   ├── equipment_management_page.html
│   ├── release_return_page.html
│   ├── overdue_monitor_page.html
│   ├── records_reports_page.html
│   └── condition_log_page.html
└── page-styles/               # one matching CSS file for each page entry
```

Each page entry uses `data-page` and `data-role` attributes to open the correct interactive screen through the shared `app.js`. This keeps the files easy to find and edit individually while avoiding duplicated request, quantity, role, and Supabase integration logic.

## Supabase integration plan

The adapter boundary is in `supabase-adapter.js`. When Supabase is ready:

1. Add `@supabase/supabase-js` and initialize a client using the project URL and anon key.
2. Replace the mock `signIn`, `signUp`, `signOut`, equipment, and request methods with Supabase Auth and typed table queries.
3. Add a `profiles` table keyed by `auth.users.id` with `role`, `student_id`, `department`, and `display_name`.
4. Add tables for `equipment`, `borrow_requests`, `request_items`, `borrow_records`, `condition_logs`, `incident_reports`, and `notifications`.
5. Use database functions / transactions for approval, release, and return so quantity rules are atomic.
6. Apply RLS policies: requesters can only read/create/cancel their own requests; staff can manage operational tables; staff routes must be rejected at the data layer, not only hidden in navigation.
7. Add an Edge Function or scheduled job that marks unreconciled released borrowings as overdue after their due date.

## Assumptions in this frontend phase

- Faculty shares the requester experience with Students but is presented as a distinct role label.
- The mock UI uses browser-local state only; a refresh resets demo changes.
- Images are intentionally omitted because this is an internal operations dashboard; the visual identity uses data-dense cards, status color, and a custom wordmark instead.
- Password fields are visual only until Supabase Auth is connected.

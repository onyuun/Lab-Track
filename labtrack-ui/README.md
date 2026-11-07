# LabTrack

LabTrack is a browser-based laboratory inventory and equipment-borrowing app. User accounts, profiles, equipment, requests, condition logs, incident reports, and notifications are loaded from and saved to the configured Supabase project. The app does not ship demo accounts or seeded example records; empty tables render empty states.

## Run locally

Serve this directory over HTTP because the app uses JavaScript modules:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173` or `http://localhost:4173/mobile.html`.

## Supabase setup

1. Confirm `supabase-config.js` contains the correct Supabase project URL and **publishable/anon** key. Never use a `service_role` key in browser code.
2. Run [`supabase/schema.sql`](supabase/schema.sql) for a new project. For the already-created project, run the additive [`supabase/admin_role_approvals.sql`](supabase/admin_role_approvals.sql) migration once; it adds profile request fields, the validated signup trigger, and Admin-only approval policies without adding a table.
3. Enable email/password authentication in Supabase Auth and set the desired email-confirmation and redirect URL settings for local/production hosting.
4. New registrations always receive the Student role. Applicants may request Faculty or Laboratory Personnel access; an Admin approves or rejects requests from the Role approvals page. To bootstrap the first Admin, set the trusted profile role in the Supabase SQL editor using the account UID from Authentication → Users:

   ```sql
   update public.profiles set role = 'Admin' where id = '<auth-user-uuid>';
   ```

   Do not assign Admin through signup. After the first Admin is set, subsequent access requests can be approved in-app.
5. Add equipment records through the app after signing in as a staff user, or insert initial inventory in the SQL editor.

The schema's role-based RLS is essential: the frontend anon key is public, and client-side route visibility is not a security boundary. Review policies for your institution before production use. The client handles login/signup, session restore/logout, equipment listing and management, request creation/review/cancellation, release/return updates, condition logs, incident reports, and notification reads.

## Notes

- The SQL migration defines the schema expected by this version; if your project already has tables with different columns, reconcile the migration and adapter to the existing schema before running it.
- Signup never directly grants Faculty, Laboratory Personnel, or Admin privileges; Admin approval changes the trusted `profiles.role`.
- Approval/release/return workflows use client-side database calls; for high-concurrency inventory environments, replace multi-call inventory changes with Postgres RPC functions/transactions.
- Overdue status is displayed from records marked `Overdue`; configure a trusted scheduled database job/Edge Function if the app should automatically transition due borrowings.

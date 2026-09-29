# MOE signup admin

Public entry: `/admin.html`. This is a separate private viewer, not a student enrolment portal. The existing public form is unchanged.

## Access

The client signs in using Supabase email links. The exact production callback `https://kapikiwebsite.vercel.app/admin.html` is configured in Supabase's redirect allowlist. `signup-auth-config.json` contains only the existing public anon key (role checked as `anon`), never a service key or database password.

The read endpoint checks the access token against Supabase Auth, requires a confirmed email and checks `kp_signup_admins` on the server before querying any registration. Browser-editable metadata does not grant access. Anonymous and ordinary authenticated users have no direct SELECT permission on registrations or the admin allowlist. Responses are private/no-store. There are no update or delete actions.

Apply `supabase/003_signup_admin.sql` before deployment. Provision only an explicitly approved owner email using a parameterised database-owner query. No owner email was assumed during initial implementation; user confirmation is pending.

## Data

The viewer reads MOE-prefixed records from `kp_course_interest`. It shows class totals, class filters, name/email search, NZ signup dates and optional learning details. Repeat email addresses are flagged, never merged or removed. Records are expressions of interest, not confirmed places. The 11 real registrations were rechecked: Level 3 = 7, Level 4 = 3, Kōrero Club = 1.

## Verification

- Production build passed.
- `node --test signup-admin-api.test.mjs interest-api.test.mjs` passed 10 checks, covering authentication, non-admin denial, confirmed email requirements, response caching and existing registration validation.
- Login page visually checked; roster layout/search/class filters/empty state checked in a temporary local sample-data harness (removed before publication).
- Real owner email delivery and authenticated browser-to-database flow remain pending owner email confirmation and sign-in. Supabase custom SMTP is not enabled; default sender delivery restrictions may apply.

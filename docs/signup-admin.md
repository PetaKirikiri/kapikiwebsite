# MOE signup viewer

Standalone entry: `/admin.html`. Opens directly without an account or sign-in, as requested. Anyone with this link can view the roster. It is not linked in the public site navigation and requests no search indexing.

The read-only GET endpoint `/__signup_admin` returns MOE registrations from `kp_course_interest`: ID, name, email, selected level and signup date. Learning notes and self-ratings are excluded. Responses are no-store. Database permissions are unchanged; anonymous clients cannot directly select the registration table. There are no update or delete actions.

The viewer provides class totals, class filters, name/email search, NZ signup dates and refresh. Repeated emails are flagged without changing records. Registrations are expressions of interest, not confirmed places.

The earlier `kp_signup_admins` migration is retained as history; the viewer no longer uses that table or Supabase Auth.

Verification: `node --test signup-admin-api.test.mjs interest-api.test.mjs` and `npm run build`. Check the deployed standalone URL and its unauthenticated endpoint after release.

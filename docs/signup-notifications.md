# Owner signup notifications

Automatic mail goes only to peta@kapiki.co.nz. There is no student mail sender,
calendar invitation sender, or class-size-triggered sender in this change.

## Connection

Run `node scripts/connect-owner-gmail.mjs` from the repository. Its one-time
loopback page receives an existing OAuth client secret without putting it in
logs, verifies the Google identity and nonce, and saves the refresh token in
`.local/google-owner.json` with owner-only permissions. This directory is ignored.
The existing localhost callback in Google Cloud is reused. Inbox access is not
requested. The temporary server shuts down after connection.

Use `node scripts/configure-owner-mail-env.mjs` in the Vercel-linked checkout
to add the three Google settings and a cron key as sensitive production values.
The script is for initial setup, not rotation. It does not overwrite existing
credentials. A redeployment is required after setting environment variables.

## Delivery

Apply `supabase/004_signup_notifications.sql` before deploying. New registrations
enqueue one private outbox entry in the same database transaction. Historical
registrations are not backfilled or emailed. The signup handler immediately
attempts delivery; a mail problem never changes a saved signup into a failed one.

A protected daily Vercel worker processes up to three queued notifications.
This is a recovery sweep, not the normal delivery schedule. Authentication
failure leaves entries pending. A definite Gmail rejection waits at least
15 minutes before another attempt. A timeout or ambiguous response is marked
`uncertain` and must be investigated manually in Gmail Sent before any resend.
Concurrent attempts use an atomic database claim. Gmail message IDs are saved
as submission receipts, not proof of inbox delivery or reading.

Pending/uncertain entries and `error_code` can be inspected in the private
`kp_signup_notifications` table. No student contact details or token values are
written to function logs. `/api/signup-mail` requires the cron secret and does
not accept recipients, content, or arbitrary signup IDs from callers.

If access is revoked or the refresh token expires, run the owner connection
again and update the sensitive production environment values. Do not remove
the previous Google client secret until all clients using it have been checked.

## Account setup completion

Migration `student-portal/011_account_setup_notifications.sql` queues one owner-only
notification atomically when an invitation first completes. It snapshots the student's
name, email, department/group, confirmed level and completion time. No password or
setup link is stored in the notification. Existing completed invitations are not backfilled.

The signed-in browser requests delivery through `/api/account-setup-notification` after
saving; identity is verified server-side and only that user's already-queued event can
be processed. Recipients and content cannot be supplied by the caller. Existing owner
Gmail credentials are reused. The existing daily recovery worker also drains pending
setup notifications; uncertain deliveries are never automatically resent.

This covers completion of the personal setup form, not every later password reset or
unrelated profile edit. Inspect `kp_account_setup_notifications` for delivery receipts
or `owner_authorization_unavailable`. A mail failure never fails the account save.

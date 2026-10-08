# Individual account setup

`account-setup.html#token=…` uses the existing registration/account form. The server determines the recipient's email and active registered levels; more than one level requires an explicit choice. The page has no analytics. Opening the link only loads details; it does not sign in or consume the invitation. Passwords go only to Supabase Auth in the existing project.

`007_account_invitations.sql` stores only a SHA-256 digest, recipient, registration IDs, expiry and completion state. `009_account_setup_no_deadline.sql` removes the deadline from all random 256-bit setup invitations, including previously prepared links. These remain available until completed or revoked; legacy Auth-token invitations remain capped at one hour. The private `/api/account-invitation` endpoint exchanges a valid setup token for a fresh Supabase magic-link credential on form submission. It never sends mail, accepts no recipient/password fields, checks account identity, and limits exchanges to once per ten seconds without permanently locking an unfinished invitation. Supabase's short token lifetime is unchanged.

`010_account_setup_completion_recovery.sql` lets only the authenticated recipient confirm that their own invitation was completed after a lost response. A retry does not overwrite a completed account.

Completion verifies ownership and a saved password, updates the original details, records the confirmed level, and closes the invitation. It does not delete registration history or grant membership/roles. Removed registrations are excluded throughout. Invalid, expired, revoked and completed links cannot load details or complete setup. Reissuing closes earlier links.

## Checks and preparation

- `node scripts/setup-account-invitations.mjs` runs rollback-only database checks. `--install` applies migrations 007–010.
- `npx tsx scripts/prepare-account-invitations.ts` audits the October MOE audience without changes. `--review` writes individual preview drafts with unusable links, without accounts or email.
- `npx tsx scripts/check-account-invitations.ts --run` tests disposable new and existing accounts against the site at `KA_PIKI_SITE_URL` (production by default). It tests a two-year-old setup link without a deadline, private saved details, explicit level choice, actual password saving, fresh login, all learning queries, partial-save retries and lost completion responses. It sends no mail and removes only its own test accounts/registrations.
- `npx vitest run --config account-invitation-vitest.mjs` runs endpoint validation/isolation tests in the website release repository.
- `--prepare` requires the deployed version-3 setup page, responding exchange endpoint, installed schema and private server credential. It reuses existing accounts or creates unconfirmed accounts in the same Auth project, then writes one recipient-specific, **unsent** draft per invitation under ignored `.local/account-invitations/` with private file permissions.

Keep `STUDENT_SUPABASE_SECRET_KEY` server-only in private local configuration and the website's production environment; it must never have a `VITE_` prefix or enter a browser bundle. Never print or commit draft files: their links are credentials. Each draft contains one `to`, its invitation ID, `expiresAt:null` and `sent:false`; no CC/BCC. Check current registration eligibility, completion and revocation before an explicitly approved send. The preparation script has no sender. Preview drafts must never be sent.

The email asks each learner to “check your details, add anything missing, and set your password.” Delivery is held until the user explicitly authorizes it.

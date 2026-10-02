# Website analytics

Apply `001_visits.sql` and `002_country.sql` using the server database owner. Public Supabase clients cannot read or write the table.

The local website serves `/analytics.html`. Local access is enabled explicitly by the Vite plugin, only for loopback requests with a local Host. Production never uses this bypass.

For deployment, set `ANALYTICS_ADMIN_KEY` to a random secret of at least 24 characters in the hosting environment. Never use a VITE_ variable for this secret. The `/api/analytics` function handles `/__analytics`; the dashboard asks for the key and keeps it in memory only. The publishable checkout includes the function and rewrite.

Collection uses existing WORDS database environment settings. Verified identity also needs the configured student Supabase URL and public key (with WORDS equivalents as fallback). Names cannot be inferred from anonymous visits. Signed-in emails are verified with Supabase Auth on the server; the collector never trusts browser-submitted identity.

Page paths omit arbitrary queries and authentication callbacks. Only the curriculum tab is retained. Referrers retain origins only. IP addresses and raw user agents are not stored. Do Not Track is respected. Browser identity uses local storage; session identity uses session storage with a 30-minute inactivity boundary. These measure browsers/sessions, not unique humans. No historical visits are backfilled. Local preview traffic is separate from live website traffic.

Country is captured from x-vercel-ip-country only when VERCEL=1. No raw IP is stored. Local, missing, and older records show Unknown. Country is approximate and may reflect a VPN. Visitor summary uses the latest visit; history keeps each visit country.

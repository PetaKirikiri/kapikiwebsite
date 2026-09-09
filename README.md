# Ka Piki website

The learner-facing Connectors website, with the existing connector presentation engine and approved shape contracts. No editor, Design Space, or database credentials are included.

## Run locally

Requires Node 22 or newer. Run `npm ci`, then `npm run dev`. The website opens on port 5180 and reads the running Connectors service on port 5176 by default. Set `CONNECTORS_API_URL` in `.env` to use another service.

## Production

### Vercel

Import the repository with its root directory unchanged. `vercel.json` builds the Vite frontend and routes the four course endpoints to `api/course.js`. In Vercel's project environment settings, set `CONNECTORS_API_URL` to the public HTTPS URL of the running Connectors service, then redeploy. A localhost URL cannot work in Vercel. Without the setting the API returns an explicit 503 configuration error, not a static-page 404.

### Other Node hosts

Run `npm ci` and `npm run build`, then set the server environment variable `CONNECTORS_API_URL` to a reachable Connectors service and run `npm start`. `PORT` defaults to 5180. Use a Node-capable host: GitHub Pages alone cannot provide the live API connection.

The API URL is server-side configuration, not a browser URL. The service must provide `/__website_preview_data`, `/__website_sentence`, `/__connector_shapes`, and `/__connector_patterns`. Only curriculum reads, sentence analysis, empty shape reads, and pattern reads are forwarded. Editing requests are rejected. Keep the upstream editing interfaces private; protect/rate-limit the public analysis endpoint at the hosting layer.

Course sentences, tags, shapes, and pattern settings stay live in Connectors. Translation alignments and draft learning notes are versioned in `src/lib/connectorPresentation/englishTranslations.json` and `structureNotes.json`; source-text changes require matching translation updates. The earlier red/green-bird batch has not been applied by this export.

## Scope

`website-preview` is the only app entry point. Shared rendering dependencies retain their original source paths to preserve geometry and behaviour. Review controls in the shared renderer are disabled on the website; no review or design workspace is mounted and no mutation API is exposed.

The replacement preserves previous repository contents in Git history. No database reset, curriculum rewrite, or deployment is performed by this repository export.

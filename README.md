# TextMy AI Humanizer

A semantic rewriting and readability tool. The GitHub Pages frontend calls the currently live Cloudflare Worker API, while `backend/` remains the reference Node/Express implementation for local development or alternative hosting.

## Current layout

```text
frontend/                  # deployed to GitHub Pages
  index.html
  app.js
  semantic-client.js
  style.css
backend/                   # reference Node/Express implementation
  server.js
  semantic-rewriter.js
  rate-limiter.js
  package.json
  .env.example
scripts/
  smoke-test.sh            # live API health/CORS/rewrite smoke test
.github/workflows/
  deploy-pages.yml
```

There is no longer an active root-level `index.html` or `app.js`. The old regex-based browser humanizer is not part of the deployed application.

## Features

- Semantic rewriting with meaning-preservation rules
- Light, Balanced, and Strong rewrite intensity
- Word-level in-browser diff after a successful rewrite
- Responsive dark/light UI
- Word and character counts
- Copy and clear actions
- Server-side API key protection in the backend service
- CORS, Helmet, input limits, retry/backoff, and rate limiting in the reference Express implementation
- No application database and no full user-text logging in the reference implementation
- Review-before-publishing disclaimer

## Current live deployment

The production API currently used by the GitHub Pages frontend is a **Cloudflare Worker**:

```text
https://latesttextmy-api.manmicheal214.workers.dev/api
```

The Worker is deployed outside this repository. Its source and deployment configuration have **not** been verified to exist in this repo, so this repository intentionally does not fabricate a `wrangler.jsonc`, Worker source, bindings, or secrets for it.

`backend/` is the reference Node/Express implementation for local development or alternative hosting. It is **not** the service currently running in production.

### TODO: reconcile the backend implementations

Worker source should be added to this repo (for example under `/worker`) and kept in sync, **or** the Express `backend/` should be redeployed as the canonical backend and the Worker retired — pick one and remove the other to avoid drift.

## Architecture

```text
GitHub Pages frontend → Cloudflare Worker API → configured AI provider

Reference/local alternative:
GitHub Pages frontend → Express backend → Gemini API
```

The frontend is published from `frontend/` by `.github/workflows/deploy-pages.yml`. The live Worker is deployed out-of-band.

## Backend setup (reference implementation)

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Set `GEMINI_API_KEY` in `.env`. Never commit `.env` or put the key in frontend files.

Health check:

```text
GET /api/health
```

Expected response from the reference Express implementation:

```json
{ "status": "ok" }
```

## Environment variables (reference implementation)

```env
PORT=3000
GEMINI_API_KEY=YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=http://localhost:5500
RATE_LIMIT_PER_MINUTE=10
MAX_INPUT_CHARS=20000
```

For production use of the reference Express backend, set `ALLOWED_ORIGIN` to the exact GitHub Pages origin.

## Frontend configuration

`frontend/index.html` points at the currently live Worker API:

```html
<script>window.TEXTMY_API_URL = "https://latesttextmy-api.manmicheal214.workers.dev/api";</script>
```

Re-verify this URL whenever the backend is redeployed or its public hostname changes. The API key must remain server-side.

The GitHub Pages workflow deploys the `frontend/` directory automatically on pushes to `main`.

## Live API smoke test

Run the smoke test from the repository root:

```bash
./scripts/smoke-test.sh
```

The script reads `window.TEXTMY_API_URL` from `frontend/index.html` unless `TEXTMY_API_URL` is supplied, then checks:

1. `GET /api/health` returns HTTP 200 and `status: ok`.
2. An `OPTIONS /api/rewrite` preflight echoes the expected GitHub Pages origin in `Access-Control-Allow-Origin`.
3. A real `POST /api/rewrite` returns HTTP 200 and non-empty rewritten text.

The GitHub Pages workflow runs the same smoke test after deployment. This does not deploy the Worker; it only verifies the separately deployed live API from the GitHub Actions runner.

## Live CORS status

The required production origin is exactly:

```text
https://manmicheal214-maker.github.io
```

A live preflight check must return that exact value in `Access-Control-Allow-Origin`. If the Worker is configured differently, that is a Worker configuration bug and should be fixed in the Worker rather than worked around in frontend code.

**Verification note:** this repository update was prepared with the required live checks, but the current execution environment could not resolve the Worker hostname (`curl` returned DNS error 6), so HTTP 200 rewrite and CORS success could not be independently confirmed from here. The smoke test is intentionally designed to fail loudly until those live checks succeed.

## Live rate limiting

The `backend/rate-limiter.js` limit applies only to the reference Express implementation. It must not be treated as the production Worker limit.

The production Worker rate limit is currently **not documented as a confirmed requests/window value** because the live Worker could not be reached from the current execution environment, so a valid repeated-request 429 observation could not be completed. Do not infer the Worker limit from the Node in-memory limiter or from an assumed Cloudflare binding configuration. Re-run a live repeated-request test against the Worker and document the observed threshold/window here once verified.

## API

`POST /api/rewrite` accepts:

```json
{ "text": "Text supplied by the user.", "intensity": "balanced" }
```

Valid intensity values are `light`, `balanced`, and `strong`.

## Security and privacy

- Never put the Gemini key in `frontend/app.js`, `frontend/semantic-client.js`, or HTML.
- `.env` is ignored by Git.
- The reference server does not intentionally log complete user text.
- The reference application does not persist input or output in a database.
- Request size and frequency are limited in the reference implementation.
- AI provider failures are returned as safe, generic messages.
- Users should not submit confidential information unless they are comfortable with the configured provider's data policies.

## Known limitations

- The production Worker is out-of-band and its source is not currently tracked here.
- The reference Express rate limiter is per-instance and in-memory; it does not describe the live Worker’s edge rate-limiting semantics.
- AI rewriting can occasionally change meaning, so review output before publishing.
- The tool does not guarantee AI-detector results.
- Provider quotas, model availability, network conditions, and outages can affect availability.
- The word-level diff is intentionally lightweight and computed entirely in the browser; it is not a semantic diff.

## Local frontend

```bash
cd frontend
python3 -m http.server 5500
```

The local frontend defaults to `http://localhost:3000/api` only if `window.TEXTMY_API_URL` is changed accordingly. For production, keep it pointed at the verified live Worker URL.

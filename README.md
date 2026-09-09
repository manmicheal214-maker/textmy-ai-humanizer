# TextMy AI Humanizer

A semantic rewriting and readability tool. The GitHub Pages frontend calls a separate Express backend, which calls Gemini without exposing the API key to the browser.

## Current layout

```text
frontend/                  # deployed to GitHub Pages
  index.html
  app.js
  semantic-client.js
  style.css
backend/                   # deployed separately as a Node service
  server.js
  semantic-rewriter.js
  rate-limiter.js
  package.json
  .env.example
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
- Server-side API key protection
- CORS, Helmet, input limits, retry/backoff, and IP-based rate limiting
- No application database and no full user-text logging
- Review-before-publishing disclaimer

## Architecture

```text
GitHub Pages frontend → Express backend → Gemini API
```

The frontend is published from `frontend/` by `.github/workflows/deploy-pages.yml`. The backend must run separately on a Node-compatible service.

## Backend setup

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

Expected response:

```json
{ "status": "ok" }
```

## Environment variables

```env
PORT=3000
GEMINI_API_KEY=YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=http://localhost:5500
RATE_LIMIT_PER_MINUTE=10
MAX_INPUT_CHARS=20000
```

For production, set `ALLOWED_ORIGIN` to the exact GitHub Pages origin.

## Frontend configuration

`frontend/index.html` contains this deployment placeholder immediately before the client loads:

```html
<script>window.TEXTMY_API_URL = "https://REPLACE_WITH_BACKEND_URL/api";</script>
```

**This placeholder must be replaced with the real public backend URL before the site can perform rewrites.** The API key must remain on the backend.

The GitHub Pages workflow deploys the `frontend/` directory automatically on pushes to `main`.

## API

`POST /api/rewrite` accepts:

```json
{ "text": "Text supplied by the user.", "intensity": "balanced" }
```

Valid intensity values are `light`, `balanced`, and `strong`.

Transient Gemini `429` and `5xx` responses receive one retry after a 500ms backoff. The frontend receives the same generic temporary-unavailable error after retries are exhausted.

## Security and privacy

- Never put the Gemini key in `frontend/app.js`, `frontend/semantic-client.js`, or HTML.
- `.env` is ignored by Git.
- The server does not intentionally log complete user text.
- The application does not persist input or output in a database.
- Request size and frequency are limited.
- Express trusts the first deployment proxy so `req.ip` can be used for per-client rate limiting.
- AI provider failures are returned as safe, generic messages.
- Users should not submit confidential information unless they are comfortable with the configured provider's data policies.

## Known limitations

- **Rate limiting is per-instance and in-memory.** If the backend is scaled to multiple instances, each instance has its own bucket, so limits are not globally shared. A shared store such as Redis would be needed for centralized production rate limiting.
- AI rewriting can occasionally change meaning, so review output before publishing.
- The tool does not guarantee AI-detector results.
- Gemini quotas, model availability, network conditions, and provider outages can affect availability.
- The word-level diff is intentionally lightweight and computed entirely in the browser; it is not a semantic diff.

## Local frontend

```bash
cd frontend
python3 -m http.server 5500
```

The local frontend expects the backend at `http://localhost:3000/api` only if you change the deployment placeholder to that local URL. For production, use the real public backend URL.

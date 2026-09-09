# TextMy AI Humanizer

A semantic rewriting and readability tool. It uses an Express backend to call Gemini while keeping the API key out of the browser.

## Features

- Semantic rewriting with meaning-preservation rules
- Light, Balanced, and Strong rewrite intensity
- Responsive dark/light UI
- Word and character counts
- Copy and clear actions
- Server-side API key protection
- CORS, Helmet, input limits, and IP-based rate limiting
- No application database and no full user-text logging

## Architecture

```text
GitHub Pages frontend → Express backend → Gemini API
```

The frontend is static and can be deployed to GitHub Pages. The backend must run separately on a Node-compatible service such as Render, Vercel, Cloudflare Workers (with an adapter), or another server platform.

## Local setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`. Do not commit `.env`.

Start the API:

```bash
npm start
```

Health check: `http://localhost:3000/api/health`

### Frontend

Because the frontend is static, serve `frontend/` with a local HTTP server. For example:

```bash
cd frontend
python3 -m http.server 5500
```

The included client defaults to `http://localhost:3000/api`. For a deployed backend, define `window.TEXTMY_API_URL` before `semantic-client.js` loads, for example in `frontend/index.html`:

```html
<script>window.TEXTMY_API_URL = "https://your-backend.example.com/api";</script>
<script src="semantic-client.js"></script>
```

Set the backend `ALLOWED_ORIGIN` to the exact frontend origin.

## Environment variables

```env
PORT=3000
GEMINI_API_KEY=YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=http://localhost:5500
RATE_LIMIT_PER_MINUTE=10
MAX_INPUT_CHARS=20000
```

## API

`GET /api/health` returns `{ "status": "ok" }`.

`POST /api/rewrite` accepts:

```json
{ "text": "Text supplied by the user.", "intensity": "balanced" }
```

Valid intensity values are `light`, `balanced`, and `strong`.

## GitHub Pages deployment

Publish the `frontend/` directory with GitHub Pages. GitHub Pages cannot safely host the Gemini API key, so the backend must be deployed separately. Configure `window.TEXTMY_API_URL` to point to the backend `/api` endpoint and configure backend CORS with the GitHub Pages origin.

## Security and privacy

- Never put the Gemini key in `frontend/app.js`, `frontend/semantic-client.js`, or HTML.
- `.env` is ignored by Git.
- The server does not intentionally log complete user text.
- The application does not persist input or output in a database.
- Request size and request frequency are limited.
- Only the configured frontend origin is accepted by CORS.
- AI provider failures are returned as safe, generic messages.
- Users should not submit confidential information unless they are comfortable with the configured provider's data policies.

## Limitations

AI rewriting can occasionally change meaning, so review output before publishing. The tool does not guarantee AI-detector results. Free API quotas and network/provider availability can affect rewriting quality and availability.

## Important implementation note

Deterministic rules are intentionally kept out of the semantic path. Regex can handle safe cleanup, but contextual rewriting is delegated to the semantic model so it can account for negation, qualifications, context, and paragraph meaning.

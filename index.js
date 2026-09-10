import { rewriteText } from "./semantic-rewriter.js";
import { validateOutput } from "./validator.js";
import { checkRateLimit } from "./rate-limiter.js";

const MAX_INPUT_CHARS = 20_000;
const VALID_INTENSITIES = new Set(["light", "balanced", "strong"]);

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "";
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body, status, env, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
      ...extraHeaders,
    },
  });
}

function errorResponse(message, status, env) {
  return json({ error: message }, status, env);
}

function getClientIP(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Real-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    "unknown"
  );
}

function handleHealth(env) {
  return json({ status: "ok", service: "textmy-api" }, 200, env);
}

async function handleRewrite(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400, env);
  }
  if (typeof payload !== "object" || payload === null) {
    return errorResponse("Request body must be a JSON object.", 400, env);
  }

  const { text, intensity } = payload;

  if (typeof text !== "string") {
    return errorResponse("Field 'text' must be a string.", 400, env);
  }
  if (text.trim().length === 0) {
    return errorResponse("Text must not be empty.", 400, env);
  }
  if (text.length > MAX_INPUT_CHARS) {
    return errorResponse("Text exceeds the maximum of " + MAX_INPUT_CHARS + " characters.", 413, env);
  }

  const resolvedIntensity = (intensity || "balanced").toLowerCase().trim();
  if (!VALID_INTENSITIES.has(resolvedIntensity)) {
    return errorResponse("Invalid intensity. Must be one of: light, balanced, strong.", 400, env);
  }

  const ip = getClientIP(request);
  const rateLimitResult = await checkRateLimit(env, ip);
  if (!rateLimitResult.allowed) {
    return json({ error: "Too many requests. Please try again later." }, 429, env, { "Retry-After": String(rateLimitResult.retryAfter || 60) });
  }

  if (!env.GEMINI_API_KEY) {
    return errorResponse("Service is not configured. API key missing.", 503, env);
  }

  let rawResult;
  try {
    rawResult = await rewriteText(text, resolvedIntensity, env);
  } catch (err) {
    return errorResponse("The rewriting service is temporarily unavailable.", 502, env);
  }

  const validation = validateOutput(rawResult, text);
  if (!validation.ok) {
    return errorResponse("The rewriting service returned an unusable response.", 502, env);
  }

  return json({ text: validation.text }, 200, env);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      if (method === "GET" && pathname === "/api/health") {
        return handleHealth(env);
      }
      if (method === "POST" && pathname === "/api/rewrite") {
        return handleRewrite(request, env);
      }
      return errorResponse("Not found.", 404, env);
    } catch (err) {
      return errorResponse("An unexpected error occurred.", 500, env);
    }
  },
};

import { handleTarotReading } from "./tarot-reading.mjs";

const API_PATH = "/api/tarot-reading";
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 100;
const rateBuckets = new Map();

function allowedOrigins(env) {
  return new Set(String(env?.TAROT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
}

function corsHeaders(origin) {
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "600",
    "cache-control": "no-store",
    "vary": "Origin",
  });
}

function errorResponse(status, message, origin) {
  const headers = corsHeaders(origin);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

function isRateLimited(request, now = Date.now()) {
  const ip = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 2048) {
    for (const [key, value] of rateBuckets) {
      if (now - value.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
    }
  }
  return bucket.count > RATE_LIMIT;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== API_PATH) return new Response("Not found", { status: 404 });

    const origin = request.headers.get("origin") || "";
    if (!allowedOrigins(env).has(origin)) {
      return errorResponse(403, "来源验证失败。", origin);
    }

    if (request.method === "OPTIONS") {
      const requestedMethod = request.headers.get("access-control-request-method");
      const requestedHeaders = String(request.headers.get("access-control-request-headers") || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (requestedMethod !== "POST" || requestedHeaders.some((value) => value !== "content-type")) {
        return errorResponse(403, "预检请求不允许。", origin);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") return errorResponse(405, "Method not allowed", origin);
    if (isRateLimited(request)) return errorResponse(429, "请求次数较多，请稍后再试。", origin);

    const response = await handleTarotReading(request, env);
    const headers = new Headers(response.headers);
    for (const [key, value] of corsHeaders(origin)) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

/**
 * Tetrahedron Relay — Vercel Edge Function.
 *
 * Forwards calls to AI providers (Anthropic, OpenAI) using your own API keys
 * stored as Vercel environment variables. Your keys never touch Tetrahedron's
 * servers.
 *
 * Routes (all behind the AUTH_TOKEN shared secret):
 *   POST /v1/messages              → api.anthropic.com (uses ANTHROPIC_API_KEY)
 *   POST /v1/chat/completions      → api.openai.com   (uses OPENAI_API_KEY)
 *
 * Caller must send `Authorization: Bearer <AUTH_TOKEN>` matching the
 * AUTH_TOKEN env var on this Vercel project. Tetrahedron seats hold the
 * same token in their "delegation auth token" field.
 */

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/api/relay")) {
    return new Response(
      "tetrahedron relay is running. POST to /v1/messages (Anthropic) or /v1/chat/completions (OpenAI).",
      { status: 200, headers: { "content-type": "text/plain", ...corsHeaders(request) } }
    );
  }

  if (request.method !== "POST") {
    return jsonError(405, "method not allowed", request);
  }

  const authToken = process.env.AUTH_TOKEN;
  if (!authToken) {
    return jsonError(
      500,
      "AUTH_TOKEN env var is not set on this Vercel project. Add it in Project Settings → Environment Variables.",
      request
    );
  }

  const presented =
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim() ||
    (request.headers.get("x-api-key") ?? "").trim();
  if (!presented || presented !== authToken) {
    return jsonError(401, "unauthorized — bad or missing AUTH_TOKEN", request);
  }

  // Path-based routing. Vercel mounts this function under /api/relay by
  // default, but we also rewrite (via vercel.json) so / forwards here too.
  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/v1/messages")) return forwardAnthropic(request);
  if (path.endsWith("/v1/chat/completions")) return forwardOpenAI(request);

  return jsonError(404, `no route for ${request.method} ${path}`, request);
}

async function forwardAnthropic(req: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return jsonError(500, "ANTHROPIC_API_KEY env var is not set on this Vercel project.", req);
  }
  const target = "https://api.anthropic.com/v1/messages";
  const headers = new Headers();
  headers.set("content-type", req.headers.get("content-type") ?? "application/json");
  headers.set("x-api-key", key);
  headers.set("anthropic-version", req.headers.get("anthropic-version") ?? "2023-06-01");
  const beta = req.headers.get("anthropic-beta");
  if (beta) headers.set("anthropic-beta", beta);

  const upstream = await fetch(target, {
    method: "POST",
    headers,
    body: req.body,
    // @ts-expect-error duplex required for streaming body in Edge runtime
    duplex: "half",
  });
  return passThrough(upstream, req);
}

async function forwardOpenAI(req: Request): Promise<Response> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return jsonError(500, "OPENAI_API_KEY env var is not set on this Vercel project.", req);
  }
  const target = "https://api.openai.com/v1/chat/completions";
  const headers = new Headers();
  headers.set("content-type", req.headers.get("content-type") ?? "application/json");
  headers.set("authorization", `Bearer ${key}`);
  const org = req.headers.get("openai-organization");
  if (org) headers.set("openai-organization", org);

  const upstream = await fetch(target, {
    method: "POST",
    headers,
    body: req.body,
    // @ts-expect-error duplex required for streaming body in Edge runtime
    duplex: "half",
  });
  return passThrough(upstream, req);
}

function passThrough(upstream: Response, req: Request): Response {
  const headers = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS, GET",
    "access-control-allow-headers":
      "authorization, content-type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access, openai-organization",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

function jsonError(status: number, message: string, req: Request): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

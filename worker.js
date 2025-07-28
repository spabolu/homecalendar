/*
  Cloudflare Worker: Secure iCal Proxy with Shared Secret
  ------------------------------------------------------
  Environment variables (set in Cloudflare dashboard or wrangler.toml):
  • ICS_URL        – Full private iCal URL from Google
  • SHARED_SECRET  – Any random string. Front-end must send this in `x-ical-key` header.
*/

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "x-ical-key, Content-Type",
          "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
        },
      });
    }

    // Authorize
    const supplied = request.headers.get("x-ical-key");
    if (supplied !== env.SHARED_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const icsUrl = env.ICS_URL;
    if (!icsUrl) {
      return new Response("ICS_URL env variable not set", { status: 500 });
    }

    try {
      const upstream = await fetch(icsUrl);
      if (!upstream.ok) {
        return new Response(`Upstream fetch failed: ${upstream.status}`, {
          status: 502,
        });
      }
      const data = await upstream.text();
      return new Response(data, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          // Cache 5 min to reduce hits on Google, need to modify
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (err) {
      return new Response(`Worker error: ${err.message}`, { status: 500 });
    }
  },
};

/**
 * Cloudflare Worker: Secure iCal Proxy with Shared Secret
 *
 * This worker acts as a secure proxy for a private iCal URL. It requires a shared secret
 * for authorization, preventing direct public access to the iCal feed.
 *
 * Environment variables that need to be set in the Cloudflare dashboard or wrangler.toml:
 * - ICS_URL: The full private iCal URL (e.g., from Google Calendar).
 * - SHARED_SECRET: A random string that the front-end must send in the 'x-ical-key' header for authorization.
 */

export default {
  /**
   * Handles incoming requests to the worker.
   * @param {Request} request - The incoming request object.
   * @param {object} env - The environment variables set for the worker.
   * @returns {Promise<Response>} - The response to be sent back to the client.
   */
  async fetch(request, env) {
    // Handle CORS preflight requests (OPTIONS method).
    // This is necessary to allow cross-origin requests from the web application.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Allow any origin
          "Access-Control-Allow-Methods": "GET, OPTIONS", // Allow specified methods
          "Access-Control-Allow-Headers": "x-ical-key, Content-Type", // Allow specified headers
          "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
        },
      });
    }

    // Authorize the request by checking the shared secret.
    const suppliedKey = request.headers.get("x-ical-key");
    if (suppliedKey !== env.SHARED_SECRET) {
      // If the key is missing or incorrect, return an "Unauthorized" response.
      return new Response("Unauthorized", { status: 401 });
    }

    // Get the iCal URL from environment variables.
    const icsUrl = env.ICS_URL;
    if (!icsUrl) {
      // If the URL is not set, return a server error.
      return new Response("ICS_URL env variable not set", { status: 500 });
    }

    try {
      // Fetch the iCal data from the upstream URL.
      const upstreamResponse = await fetch(icsUrl);
      if (!upstreamResponse.ok) {
        // If the upstream fetch fails, return a "Bad Gateway" response.
        return new Response(`Upstream fetch failed: ${upstreamResponse.status}`, {
          status: 502,
        });
      }
      // Get the response body as text.
      const data = await upstreamResponse.text();

      // Return the fetched iCal data with appropriate headers.
      return new Response(data, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Access-Control-Allow-Origin": "*", // Allow any origin for the actual request
          // Cache the response for 5 minutes to reduce hits on the upstream server (e.g., Google Calendar).
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (err) {
      // If any other error occurs, return a generic worker error.
      return new Response(`Worker error: ${err.message}`, { status: 500 });
    }
  },
};

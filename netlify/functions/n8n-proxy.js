// netlify/functions/n8n-proxy.js
exports.handler = async (event) => {
  const base = (process.env.VITE_N8N_BASE_URL || process.env.N8N_BASE_URL || "").replace(/\/+$/, "");
  const mode = (process.env.VITE_N8N_MODE || process.env.N8N_MODE || "prod").toLowerCase();
  const prefix = mode === "test" ? "/webhook-test" : "/webhook";
  if (!base) return { statusCode: 500, body: JSON.stringify({ error: "Missing VITE_N8N_BASE_URL" }) };

  // trecho depois de /.netlify/functions/n8n-proxy/
  const after = event.path.split("/.netlify/functions/n8n-proxy/")[1] || "";
  const afterClean = after.startsWith("/") ? after : `/${after}`;
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const target = `${base}${prefix}${afterClean}${query}`;

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    };
  }

  const headers = { ...event.headers };
  delete headers.host;

  const resp = await fetch(target, {
    method: event.httpMethod,
    headers,
    body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
  });

  const text = await resp.text();
  const outHeaders = {};
  resp.headers.forEach((v, k) => (outHeaders[k] = v));
  outHeaders["Access-Control-Allow-Origin"] = "*";

  return { statusCode: resp.status, headers: outHeaders, body: text };
};

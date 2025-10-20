// netlify/functions/n8n-proxy.js
exports.handler = async (event) => {
  // BASE do seu n8n (defina em variáveis do Netlify):
  // VITE_N8N_BASE_URL = https://fluxos.eleveaagencia.com.br
  const base = (process.env.VITE_N8N_BASE_URL || process.env.N8N_BASE_URL || "").replace(/\/+$/, "");
  if (!base) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing VITE_N8N_BASE_URL" }) };
  }

  // rota original depois de /api/n8n/
  const after = event.path.split("/.netlify/functions/n8n-proxy/")[1] || "";
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const target = `${base}/${after}${query}`;

  // Pré-flight
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

  // Encaminha mantendo método, headers e corpo
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

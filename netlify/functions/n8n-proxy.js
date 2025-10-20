export const handler = async (event) => {
  const BASE = process.env.N8N_BASE_URL || "https://fluxos.eleveaagencia.com.br";
  const MODE = (process.env.N8N_MODE || "prod").toLowerCase();
  const PREFIX = MODE === "test" ? "/webhook-test" : "/webhook";

  const forwardPath = event.path.replace(/^\/api\/n8n/, "");
  const target = `${BASE}${PREFIX}${forwardPath}`;

  const resp = await fetch(target, {
    method: event.httpMethod,
    headers: { "Content-Type": "application/json" },
    body: event.body || undefined,
  });

  const text = await resp.text();
  return {
    statusCode: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") || "application/json", "Access-Control-Allow-Origin": "*" },
    body: text,
  };
};

// netlify/functions/client-api.js
// API simplificada - apenas para funcionalidades que não foram migradas para n8n

/* ========= ENV ========= */
const ADMIN_DASH_TOKEN =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

/* ========= HELPERS ========= */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS,
      ...extraHeaders,
    },
  });
}

/* ========= HANDLER ========= */
export default async (req) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });

    const isGET = req.method === "GET";
    const isPOST = req.method === "POST";
    if (!isGET && !isPOST) return json(405, { ok: false, error: "method_not_allowed" });

    const url = new URL(req.url);
    const q = url.searchParams;
    const body = isPOST ? (await req.json().catch(() => ({}))) : {};
    const action = String((isGET ? q.get("action") : body.action) || "").trim();

    // Debug de ambiente
    if (action === "debug_env") {
      return json(200, {
        ok: true,
        env: { NODE_ENV: process.env.NODE_ENV || null },
        message: "Sistema migrado para n8n - use as APIs diretas"
      });
    }

    // Retornar erro para ações que foram migradas para n8n
    const migratedActions = [
      'recordEvent', 'recordHit', 'analytics_get_dashboard', 'analytics_track_event',
      'feedback_submit', 'feedback_get_public', 'feedback_set_approval', 'list_feedbacks',
      'wa_list_messages', 'wa_list_contacts', 'wa_send', 'wa_send_text', 'wa_send_template',
      'wa_get_templates', 'wa_upsert_template', 'wa_update_contact', 'wa_import_contacts'
    ];

    if (migratedActions.includes(action)) {
      return json(410, {
        ok: false,
        error: "Esta funcionalidade foi migrada para n8n",
        message: "Use as APIs diretas do n8n em https://fluxos.eleveaagencia.com.br/webhook",
        action: action
      });
    }

    // Ações que ainda não foram migradas (se houver)
    if (action === "get_status") {
      return json(200, {
        ok: true,
        status: "active",
        message: "Sistema migrado para n8n"
      });
    }

    if (action === "get_settings") {
      return json(200, {
        ok: true,
        settings: {},
        message: "Use as APIs do n8n para configurações"
      });
    }

    if (action === "client_plan" || action === "client-plan") {
      return json(200, {
        ok: true,
        plan: "free",
        message: "Use as APIs do n8n para informações de plano"
      });
    }

    if (action === "auth_status") {
      return json(200, {
        ok: true,
        authenticated: false,
        message: "Use as APIs do n8n para autenticação"
      });
    }

    /* -------------------------------------------------- */
    return json(400, { 
      ok: false, 
      error: "no_action_provided",
      message: "Esta funcionalidade foi migrada para n8n. Use https://fluxos.eleveaagencia.com.br/webhook"
    });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};
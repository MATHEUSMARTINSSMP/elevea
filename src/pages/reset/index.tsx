// src/pages/reset/index.tsx
import React, { useEffect, useMemo, useState } from "react";

const LOGIN_URL = "/login";

function useQuery() {
  return useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams("");
    return new URLSearchParams(window.location.search);
  }, []);
}

type Step = "request" | "confirm";

export default function ResetPage() {
  const q = useQuery();
  const qEmail = ((q.get("email") || q.get("e") || "") + "").toLowerCase().trim();
  const qToken = ((q.get("token") || q.get("t") || "") + "").trim();

  const [step, setStep] = useState<Step>(qEmail || qToken ? "confirm" : "request");

  // REQUEST
  const [email, setEmail] = useState(qEmail);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqMsg, setReqMsg] = useState<string | null>(null);
  const [reqErr, setReqErr] = useState<string | null>(null);

  // CONFIRM
  const [confirmEmail, setConfirmEmail] = useState(qEmail);
  const [token, setToken] = useState(qToken);
  const [password, setPassword] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [redirectSecs, setRedirectSecs] = useState(5);

  useEffect(() => {
    if (qEmail || qToken) {
      setStep("confirm");
      setConfirmEmail(qEmail);
      setToken(qToken);
    }
  }, [qEmail, qToken]);

  useEffect(() => {
    if (!confirmMsg) return;
    const t = setInterval(() => {
      setRedirectSecs((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (typeof window !== "undefined") window.location.assign(LOGIN_URL);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [confirmMsg]);

  function explainError(code?: string | null) {
    switch (code) {
      case "missing_email":
      case "missing_email_or_token":
      case "missing_email_or_token_or_password":
      case "dados_incompletos":
        return "Informe e-mail, token e a nova senha.";
      case "user_not_found":
        return "Se existir uma conta com este e-mail, enviaremos o link. Verifique sua caixa de entrada e spam.";
      case "invalid_token":
      case "token_invalid":
      case "token_expired":
        return "Token inválido ou expirado. Gere um novo link.";
      case "weak_password":
      case "password_too_short":
        return "A nova senha deve ter pelo menos 6 caracteres.";
      default:
        return "Não foi possível completar a operação. Tente novamente.";
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqLoading(true);
    setReqErr(null);
    setReqMsg(null);
    try {
      const payload = { email: (email || "").toLowerCase().trim() };
      const r = await fetch("https://fluxos.eleveaagencia.com.br/webhook/api/auth/password-reset-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-APP-KEY": "#mmP220411",
        },
        body: JSON.stringify(payload),
      });
      const out = await r.json().catch(() => ({} as any));
      if (r.ok && !out?.error) {
        setReqMsg("Se existir uma conta com este e-mail, enviamos um link de redefinição. Confira também o spam.");
      } else {
        setReqErr(explainError(out?.error));
      }
    } catch {
      setReqErr("Falha de rede. Tente novamente.");
    } finally {
      setReqLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setConfirmLoading(true);
    setConfirmErr(null);
    setConfirmMsg(null);
    try {
      const payload = {
        email: (confirmEmail || "").toLowerCase().trim(),
        token: (token || "").trim(),
        password: password,
      };
      const r = await fetch("https://fluxos.eleveaagencia.com.br/webhook/api/auth/password-reset-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-APP-KEY": "#mmP220411",
        },
        body: JSON.stringify(payload),
      });
      const out = await r.json().catch(() => ({} as any));
      // Sucesso = resposta sem "error" (o n8n pode devolver o objeto do token sem "success")
      if (r.ok && !out?.error) {
        setConfirmMsg("Senha alterada com sucesso! Redirecionando para o login…");
      } else {
        setConfirmErr(explainError(out?.error));
      }
    } catch {
      setConfirmErr("Falha de rede. Tente novamente.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        {step === "confirm" ? (
          <>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Definir nova senha</h1>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              Cole o <b>e-mail</b> e o <b>token</b> que você recebeu e defina a nova senha.
            </p>

            <form className="form-mobile" onSubmit={handleConfirm}>
              <div className="form-group-mobile">
                <label className="text-xs sm:text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  required
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="seu@exemplo.com"
                  className="form-input-mobile w-full border rounded-xl"
                />
              </div>

              <div className="form-group-mobile">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Token</label>
                <input
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx..."
                  className="form-input-mobile w-full border rounded-xl"
                />
              </div>

              <div className="form-group-mobile">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="form-input-mobile w-full border rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={confirmLoading}
                className="btn-mobile w-full bg-black text-white rounded-xl font-semibold disabled:opacity-70"
              >
                {confirmLoading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>

            {confirmMsg && (
              <div style={{ color: "#065f46", marginTop: 12 }}>
                <p>{confirmMsg}</p>
                <button
                  style={{
                    width: "100%",
                    marginTop: 8,
                    border: "1px solid #111",
                    borderRadius: 10,
                    height: 40,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                  onClick={() => (typeof window !== "undefined" ? window.location.assign(LOGIN_URL) : null)}
                >
                  Ir para o login agora
                </button>
                <p style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                  Redirecionando automaticamente em {redirectSecs}s…
                </p>
              </div>
            )}
            {confirmErr && <p style={{ color: "#b91c1c", marginTop: 12 }}>{confirmErr}</p>}

            <hr style={{ margin: "16px 0", borderColor: "#eee" }} />
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Precisa pedir um novo link?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setStep("request");
                }}
              >
                Clique aqui
              </a>
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              <a href="/">Voltar para a home</a>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Redefinir senha</h1>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>Informe seu e-mail para enviarmos um link de redefinição.</p>

            <form onSubmit={handleRequest}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@exemplo.com"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  padding: "0 12px",
                  marginBottom: 12,
                }}
              />

              <button
                disabled={reqLoading}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: 0,
                  background: "black",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: reqLoading ? 0.7 : 1,
                }}
              >
                {reqLoading ? "Enviando..." : "Enviar link"}
              </button>
            </form>

            {reqMsg && <p style={{ color: "#065f46", marginTop: 12 }}>{reqMsg}</p>}
            {reqErr && <p style={{ color: "#b91c1c", marginTop: 12 }}>{reqErr}</p>}

            <hr style={{ margin: "16px 0", borderColor: "#eee" }} />
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Já tem <b>token</b>?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setStep("confirm");
                }}
              >
                Definir nova senha
              </a>
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              <a href="/">Voltar para a home</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

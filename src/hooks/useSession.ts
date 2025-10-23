import { useEffect, useState } from "react";

export type User = {
  email: string;
  role: "admin" | "client";
  siteSlug?: string;
  plan?: "dev" | "vip" | "essential" | string;
};

const ME_URL = "/.netlify/functions/auth-session?action=me";

function readAuth(): User | null {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email) return null;
    return parsed as User;
  } catch {
    return null;
  }
}

export function useSession() {
  const [user, setUser] = useState<User | null>(() => readAuth());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        console.log("🔍 useSession: Fazendo fetch para", ME_URL);
        const r = await fetch(ME_URL, { credentials: "include" });
        console.log("🔍 useSession: Response status", r.status);
        const data = await r.json().catch(() => ({} as any));
        console.log("🔍 useSession: Response data", data);

        if (!alive) return;

        if (data?.ok && data.user) {
          const merged: User = {
            email: data.user.email,
            role: data.user.role,
            siteSlug: (data.user as any).siteSlug || "",
            plan: (data.user as any).plan || "",
          };
          console.log("🔍 useSession: Usuário encontrado", merged);
          setUser(merged);
          try { localStorage.setItem("auth", JSON.stringify(merged)); } catch {}
        } else {
          console.log("🔍 useSession: Usuário não encontrado ou erro", data);
          setUser(null);
          try { localStorage.removeItem("auth"); } catch {}
        }
      } catch (error) {
        console.log("🔍 useSession: Erro na requisição", error);
        // se ME falhar, mantém o que tiver no storage
      } finally {
        if (alive) {
          console.log("🔍 useSession: Ready = true");
          setReady(true);
        }
      }
    })();

    return () => { alive = false; };
  }, []);

  return { user, setUser, ready };
}

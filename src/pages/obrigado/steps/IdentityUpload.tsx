import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

/* ===================== Tipos ===================== */
type Props = {
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  documentCPF: string;
  setDocumentCPF: (v: string) => void;
  siteSlugInput: string;
  setSiteSlugInput: (v: string) => void;

  logoLink: string;
  setLogoLink: (v: string) => void;
  fotosLink: string;
  setFotosLink: (v: string) => void;

  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
  fotoFiles: FileList | null;
  setFotoFiles: (fl: FileList | null) => void;

  // Se o pai fornecer, usamos o upload externo (multipart)
  uploading?: boolean;
  onUploadClick?: () => void;

  // Para exibir link da pasta criada
  driveFolderUrl?: string;
  setDriveFolderUrl?: (v: string) => void;
};

/* ===================== Helpers ===================== */
const APPS_URL =
  (import.meta.env.VITE_APPS_WEBAPP_URL as string)?.trim() ||
  (import.meta.env.VITE_SHEETS_WEBAPP_URL as string)?.trim() ||
  "";

function normSlug(v: string) {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fileToB64Obj(file: File | null) {
  if (!file) return null;
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { name: file.name, mime: file.type || "application/octet-stream", b64 };
}

async function filesToB64Array(list: FileList | null) {
  if (!list?.length) return [];
  const out: Array<{ name: string; mime: string; b64: string }> = [];
  for (let i = 0; i < list.length; i++) {
    const f = list.item(i);
    if (!f) continue;
    const o = await fileToB64Obj(f);
    if (o) out.push(o);
  }
  return out;
}

/* ===================== Componente ===================== */
function IdentityUpload(p: Props) {
  const usingExternalUpload = typeof p.onUploadClick === "function";
  const busy = Boolean(p.uploading);

  // Upload interno (base64) — só usado se NÃO tiver onUploadClick do pai
  const [internalBusy, setInternalBusy] = useState(false);
  const effectiveBusy = usingExternalUpload ? busy : internalBusy;

  async function uploadInternalBase64() {
    if (!APPS_URL) {
      alert("Defina VITE_APPS_WEBAPP_URL (ou VITE_SHEETS_WEBAPP_URL) com a URL do Apps Script (…/exec).");
      return;
    }
    const email = (p.email || "").trim().toLowerCase();
    const slug = normSlug(p.siteSlugInput || "");
    if (!email || !slug) {
      alert("Preencha e-mail e o nome do site (slug) antes de enviar.");
      return;
    }

    setInternalBusy(true);
    try {
      const logoObj  = await fileToB64Obj(p.logoFile);
      const fotosArr = await filesToB64Array(p.fotoFiles);

      const payload: any = {
        type: "upload_base64",
        email,
        siteSlug: slug,
        logoLink:  p.logoLink  || "",
        fotosLink: p.fotosLink || "",
      };
      if (logoObj)         payload.logo  = logoObj;
      if (fotosArr.length) payload.fotos = fotosArr;

      const res = await fetch(`${APPS_URL}?type=upload_base64`, {
        method: "POST",
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || j?.ok !== true) throw new Error(j?.error || `Falha no upload (${res.status})`);

      if (j.driveFolderUrl && p.setDriveFolderUrl) p.setDriveFolderUrl(String(j.driveFolderUrl));
      alert("Arquivos enviados! Verifique a pasta do Drive.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setInternalBusy(false);
    }
  }

  const showEnvDevBanner = import.meta.env.DEV && !APPS_URL && !usingExternalUpload;

  return (
    <div className="space-y-5">
      {showEnvDevBanner && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          <b>Dev:</b> defina <code>VITE_APPS_WEBAPP_URL</code> ou passe um{" "}
          <code>onUploadClick</code> externo. Em produção esse aviso não aparece.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-white/70">E-mail</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40"
            placeholder="Seu e-mail"
            value={p.email}
            onChange={(e) => p.setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-white/70">WhatsApp</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40"
            placeholder="(DDD) 9xxxx-xxxx"
            value={p.phone}
            onChange={(e) => p.setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-white/70">CPF/CNPJ</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40"
            placeholder="CPF ou CNPJ"
            value={p.documentCPF}
            onChange={(e) => p.setDocumentCPF(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-white/70">Nome do site (slug)</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40"
            placeholder="Ex.: MINHA-LOJA"
            value={p.siteSlugInput}
            onChange={(e) => p.setSiteSlugInput(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-white/50">
            Ex.: se digitar <b>MINHA-LOJA</b>, o endereço poderá ficar como{" "}
            <code>minha-loja.netlify.app</code>.
          </p>
        </div>
      </div>

      {/* Instruções para envio de imagens */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-2xl">📸</span>
          <div>
            <h3 className="text-white font-medium mb-1">Envie suas imagens</h3>
            <p className="text-sm text-white/70">
              Cole aqui os links públicos das suas imagens. A pasta precisa estar configurada como pública!
            </p>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3 mb-3">
          <p className="text-xs text-white/80 font-medium mb-2">📌 Como compartilhar no Google Drive:</p>
          <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside">
            <li>Clique com o botão direito no arquivo</li>
            <li>Selecione "Obter link" ou "Compartilhar"</li>
            <li>Altere para "Qualquer pessoa com o link"</li>
            <li>Copie o link e cole aqui</li>
          </ol>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-white/80 font-medium mb-1">💡 Também aceitamos:</p>
          <p className="text-xs text-white/70">Dropbox, OneDrive, Imgur, ou qualquer link público de imagem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-white/70">Link da logo</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40"
            placeholder="https://drive.google.com/file/d/..."
            value={p.logoLink}
            onChange={(e) => p.setLogoLink(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/70">Links das fotos (logo, empresa, produtos)</label>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40 min-h-[80px]"
            placeholder="https://drive.google.com/file/d/...&#10;https://drive.google.com/file/d/..."
            value={p.fotosLink}
            onChange={(e) => p.setFotosLink(e.target.value)}
          />
          <p className="text-xs text-red-400">
            ⚠️ Certifique-se de que TODOS os links estão públicos
          </p>
        </div>
      </div>
    </div>
  );
}

export default IdentityUpload;
export { IdentityUpload };

// /src/pages/obrigado/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { n8n } from "@/lib/n8n";
import { Loader2 } from "lucide-react";
import { IdentityUpload, ContentStep, StyleStep, TemplateStep } from "./steps";
import { AddressStep } from "./steps/AddressStep";
import { ReviewStep } from "./steps/ReviewStep";

const WHATSAPP_URL =
  (import.meta.env.VITE_WHATSAPP_URL as string)?.trim() ||
  "https://wa.me/5500000000000?text=Ol%C3%A1%20Elevea!%20Acabei%20de%20assinar%20e%20quero%20finalizar%20meu%20site.";

// util: querystring
function q(param: string, def = "") {
  const sp = new URLSearchParams(window.location.search);
  return sp.get(param) || def;
}


export default function ObrigadoPage() {
  // Plano detectado pela URL (sem seletor na UI)
  const planFromURL = useMemo(() => q("plano", "").toLowerCase(), []);
  const plano: "vip" | "essential" = planFromURL.includes("vip") ? "vip" : "essential";


  // ---------- Identidade ----------
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentCPF, setDocumentCPF] = useState("");
  const [siteSlugInput, setSiteSlugInput] = useState("");
  const [logoLink, setLogoLink] = useState("");
  const [fotosLink, setFotosLink] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [fotoFiles, setFotoFiles] = useState<FileList | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // ---------- Conteúdo ----------
  const [historia, setHistoria] = useState("");
  const [produtos, setProdutos] = useState("");
  const [fundacao, setFundacao] = useState("");
  
  // Novos campos para personalização
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [publicoAlvo, setPublicoAlvo] = useState("");
  const [diferencial, setDiferencial] = useState("");
  const [valores, setValores] = useState("");
  const [missao, setMissao] = useState("");
  const [visao, setVisao] = useState("");
  const [especialidades, setEspecialidades] = useState("");
  const [horarios, setHorarios] = useState("");
  const [formasPagamento, setFormasPagamento] = useState("");
  const [promocoes, setPromocoes] = useState("");
  const [certificacoes, setCertificacoes] = useState("");
  const [premios, setPremios] = useState("");
  const [depoimentos, setDepoimentos] = useState("");
  const [redesSociais, setRedesSociais] = useState("");
  const [secoesPersonalizadas, setSecoesPersonalizadas] = useState("");

  // ---------- Visual ----------
  const [paleta, setPaleta] = useState("dourado");
  const [template, setTemplate] = useState("classico");

  // ---------- Endereço ----------
  const [endereco, setEndereco] = useState({
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  // Passos
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Foco inicial
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>('input[name="email"]');
    el?.focus();
  }, []);

  // Função de upload desabilitada - usar links públicos
  const onUploadClick = async () => {
    alert("⚠️ Upload de arquivos desabilitado.\n\nPor favor, use links públicos do Google Drive, Dropbox ou OneDrive nos campos de logo e fotos.");
  };

  // ========== Submit final via n8n ==========
  const onSubmitAll = async () => {
    if (!email) {
      alert("Preencha pelo menos o e-mail.");
      return;
    }

    try {
      setSubmitting(true);

      // Combinar logoLink e fotosLink em uma única string (separados por vírgula)
      const allImagesUrls = [logoLink, fotosLink].filter(Boolean).join(',');
      
      const result = await n8n.startOnboarding({
        email,
        name: email.split('@')[0], // fallback para nome se não tiver
        company: siteSlugInput || "Minha Empresa",
        phone,
        site_slug: siteSlugInput || email.split('@')[0],
        plan: plano,
        company_history: historia,
        main_products: produtos,
        mission: missao,
        vision: visao,
        values: valores,
        address: `${endereco.logradouro}, ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}`,
        logo_url: allImagesUrls || '', // Todas as imagens em um único campo
        observations: `Tipo: ${tipoNegocio}\nPúblico: ${publicoAlvo}\nHorários: ${horarios}\n${secoesPersonalizadas ? `Seções: ${secoesPersonalizadas}` : ''}`,
      });

      console.log("Onboarding criado:", result);
      alert(`✅ Onboarding criado com sucesso!\n\nSite: ${result.site_slug || siteSlugInput}\nID: ${result.onboarding_id || 'criado'}`);
      
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0c151c]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0b1220]/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-400/30 grid place-items-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M20 7L9 18l-5-5"
                      fill="none"
                      stroke="rgb(52 211 153)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-white">
                    Pagamento aprovado
                  </h1>
                  <p className="text-sm text-white/70 mt-1">
                    Obrigado! Recebemos sua assinatura {plano === "vip" ? "do plano VIP" : "do plano Essencial"}.{" "}
                    Siga os passos para concluir seu cadastro — leva menos de 3 minutos.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
                >
                  Falar no WhatsApp agora
                </a>
                <a
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Voltar para o site
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* PASSO 1 — Identidade & Upload */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-medium text-white">1) Identidade</h2>
              <p className="text-sm text-white/60 mt-1">
                Quem é você e como quer que apareça o seu site? Envie logo/fotos se quiser.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <IdentityUpload
              email={email} setEmail={setEmail}
              phone={phone} setPhone={setPhone}
              documentCPF={documentCPF} setDocumentCPF={setDocumentCPF}
              siteSlugInput={siteSlugInput} setSiteSlugInput={setSiteSlugInput}
              logoLink={logoLink} setLogoLink={setLogoLink}
              fotosLink={fotosLink} setFotosLink={setFotosLink}
              logoFile={logoFile} setLogoFile={setLogoFile}
              fotoFiles={fotoFiles} setFotoFiles={setFotoFiles}
              driveFolderUrl={driveFolderUrl} setDriveFolderUrl={setDriveFolderUrl}
              uploading={uploading}
              onUploadClick={onUploadClick}
            />
          </div>

          <div className="mt-6 flex items-center justify-end">
            <Button
              className="bg-white text-gray-900 hover:bg-white/90"
              onClick={() => setStep(2)}
              disabled={uploading}
            >
              Continuar
            </Button>
          </div>
        </section>

        {/* PASSO 2 — Conteúdo & Visual & Endereço */}
        {step >= 2 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-7 space-y-8">
            <div>
              <h2 className="text-lg md:text-xl font-medium text-white">2) Conteúdo</h2>
              <p className="text-sm text-white/60 mt-1">Conte sua história e o que você vende.</p>
              <div className="mt-4">
                <ContentStep
                  historia={historia} setHistoria={setHistoria}
                  produtos={produtos} setProdutos={setProdutos}
                  fundacao={fundacao} setFundacao={setFundacao}
                  tipoNegocio={tipoNegocio} setTipoNegocio={setTipoNegocio}
                  publicoAlvo={publicoAlvo} setPublicoAlvo={setPublicoAlvo}
                  diferencial={diferencial} setDiferencial={setDiferencial}
                  valores={valores} setValores={setValores}
                  missao={missao} setMissao={setMissao}
                  visao={visao} setVisao={setVisao}
                  especialidades={especialidades} setEspecialidades={setEspecialidades}
                  horarios={horarios} setHorarios={setHorarios}
                  formasPagamento={formasPagamento} setFormasPagamento={setFormasPagamento}
                  promocoes={promocoes} setPromocoes={setPromocoes}
                  certificacoes={certificacoes} setCertificacoes={setCertificacoes}
                  premios={premios} setPremios={setPremios}
                  depoimentos={depoimentos} setDepoimentos={setDepoimentos}
                  redesSociais={redesSociais} setRedesSociais={setRedesSociais}
                  secoesPersonalizadas={secoesPersonalizadas} setSecoesPersonalizadas={setSecoesPersonalizadas}
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-medium text-white">Visual — Paleta</h2>
              <p className="text-sm text-white/60 mt-1">Escolha um estilo de cores.</p>
              <div className="mt-4">
                <StyleStep paleta={paleta} setPaleta={setPaleta} />
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-medium text-white">Visual — Template</h2>
              <p className="text-sm text-white/60 mt-1">Escolha a base do layout.</p>
              <div className="mt-4">
                <TemplateStep template={template} setTemplate={setTemplate} />
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-medium text-white">Endereço (opcional)</h2>
              <p className="text-sm text-white/60 mt-1">Se quiser, informe para podermos colocar no mapa/rodapé.</p>
              <div className="mt-4">
                <AddressStep endereco={endereco} setEndereco={setEndereco} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" className="text-white/80 hover:bg-white/10" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="bg-white text-gray-900 hover:bg-white/90" onClick={() => setStep(3)}>
                Revisar e enviar
              </Button>
            </div>
          </section>
        )}

        {/* PASSO 3 — Revisão & Envio */}
        {step >= 3 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-7">
            <h2 className="text-lg md:text-xl font-medium text-white">3) Revisão</h2>
            <p className="text-sm text-white/60 mt-1">
              Confira os dados. Ao enviar, suas respostas são salvas e o prompt é gerado (internamente).
            </p>

            <div className="mt-6">
              <ReviewStep
                data={{
                  plano,
                  siteSlugInput,
                  email,
                  phone,
                  documentCPF,
                  driveFolderUrl,
                  historia,
                  produtos,
                  fundacao,
                  paleta,
                  template,
                  endereco,
                  // Novos campos
                  tipoNegocio,
                  publicoAlvo,
                  diferencial,
                  valores,
                  missao,
                  visao,
                  especialidades,
                  horarios,
                  formasPagamento,
                  promocoes,
                  certificacoes,
                  premios,
                  depoimentos,
                  redesSociais,
                  secoesPersonalizadas,
                }}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" className="text-white/80 hover:bg-white/10" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                onClick={onSubmitAll}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar dados"
                )}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

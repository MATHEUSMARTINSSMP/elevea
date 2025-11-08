import { useEffect, useState } from "react";

export default function GoogleCallback() {
  const [msg, setMsg] = useState("Finalizando conexão com o Google…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = new URLSearchParams(window.location.search);
        const code = p.get("code");
        const state = p.get("state");
        const error = p.get("error");
        
        if (error) {
          setError(`Erro do Google: ${error}`);
          return;
        }
        
        if (!code || !state) { 
          setError("URL inválida - código ou state ausente"); 
          return; 
        }

        // Validar e extrair dados do state
        // O workflow gera state como: customerId|siteSlug|nonce
        const stateParts = state.split('|');
        if (stateParts.length !== 3) {
          setError("State inválido - formato incorreto");
          return;
        }
        
        const [customerId, siteSlug, nonce] = stateParts;
        const userEmail = customerId; // customerId é o email
        
        if (!siteSlug || !userEmail) {
          setError("State inválido - dados ausentes");
          return;
        }

        setMsg("Processando autorização...");

        // Fazer POST para exchange via n8n usando biblioteca
        try {
          const { n8n } = await import('@/lib/n8n');
          
          const result = await n8n.googleAuthCallback({
            code,
            state,
            redirect_uri: window.location.origin + '/auth/google/callback',
            siteSlug,
            userEmail
          });
          
          if (result.success || result.connected) {
            // Sucesso - redirecionar para dashboard
            window.location.replace(`/client/dashboard?gmb=ok&site=${encodeURIComponent(siteSlug)}`);
          } else {
            throw new Error(result.error || 'Erro desconhecido na autenticação');
          }
        } catch (err: any) {
          setError(`Erro na troca de tokens: ${err.message}`);
        }
      } catch (e) {
        console.error('Erro no callback:', e);
        setError(`Erro interno: ${String(e)}`);
      }
    })();
  }, []);

  if (error) {
    return (
      <div style={{color:"#fff", background:"#0b1324", minHeight:"100vh", display:"grid", placeItems:"center"}}>
        <div style={{opacity:.85, textAlign: 'center'}}>
          <div style={{color: '#ef4444', marginBottom: '1rem'}}>❌ Erro</div>
          <div style={{marginBottom: '1rem'}}>{error}</div>
          <button 
            onClick={() => window.location.href = '/client/dashboard'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{color:"#fff", background:"#0b1324", minHeight:"100vh", display:"grid", placeItems:"center"}}>
      <div style={{opacity:.85, textAlign: 'center'}}>
        <div style={{marginBottom: '1rem'}}>🔄 {msg}</div>
        <div style={{fontSize: '0.875rem', opacity: 0.7}}>
          Aguarde enquanto processamos sua autorização...
        </div>
      </div>
    </div>
  );
}

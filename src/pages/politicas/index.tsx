import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function PoliticasPage() {
  const year = new Date().getFullYear();
  const updated = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    document.title = 'Políticas de Privacidade e Termos - Agência Elevea';
  }, []);

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="mb-12">
      <h2 className="text-3xl font-bold mb-6">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0c151c]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0b1220]/60 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="text-xl font-bold text-white hover:text-primary">
                Agência Elevea
              </a>
            </div>
            <Button asChild variant="ghost" className="text-white/80 hover:text-white">
              <a href="/">← Voltar</a>
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Políticas e Termos</h1>
          <div className="text-muted-foreground mb-8">Última atualização: {updated}</div>

          <nav aria-label="Navegação rápida" className="flex flex-wrap gap-3 mb-8 p-4 bg-muted/30 rounded-lg">
            <a href="#identidade" className="text-sm hover:text-primary">Identidade do Aplicativo</a>
            <a href="#funcionalidade" className="text-sm hover:text-primary">Funcionalidades</a>
            <a href="#privacidade" className="text-sm hover:text-primary">Política de Privacidade</a>
            <a href="#termos" className="text-sm hover:text-primary">Termos de Serviço</a>
            <a href="#dados" className="text-sm hover:text-primary">Uso de Dados</a>
            <a href="#exclusao" className="text-sm hover:text-primary">Exclusão de Dados</a>
            <a href="#contato" className="text-sm hover:text-primary">Contato</a>
      </nav>

          <hr className="my-8 border-border" />

          <Section id="identidade" title="Identidade do Aplicativo">
            <p>
              A <strong>Agência Elevea</strong> é uma plataforma de automação e gerenciamento de negócios locais, especializada em criar e administrar presença digital para pequenos negócios, incluindo integração com Google Meu Negócio, gestão de avaliações e automações de atendimento.
            </p>
            <p>
              Somos uma empresa localizada em Macapá, Amapá, Brasil, dedicada a democratizar o acesso a ferramentas digitais profissionais para empreendedores locais.
            </p>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="font-semibold mb-2">Informações de Contato:</p>
              <ul className="space-y-1 text-sm">
                <li>• Site: <a href="https://agenciaelevea.netlify.app" className="text-primary hover:underline">agenciaelevea.netlify.app</a></li>
                <li>• Instagram: <a href="https://www.instagram.com/elevea.agencia" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">@elevea.agencia</a></li>
                <li>• WhatsApp: (96) 9 8103-2928</li>
                <li>• E-mail: suporte@eleveaagencia.com.br</li>
              </ul>
            </div>
          </Section>

          <Section id="funcionalidade" title="Funcionalidades do Aplicativo">
            <p>Nossa plataforma oferece as seguintes funcionalidades principais:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Gerenciamento de Google Meu Negócio:</strong> Integração com a API do Google Business Profile para busca, visualização e gerenciamento de avaliações e informações do perfil do negócio</li>
              <li><strong>Autenticação OAuth Google:</strong> Permissão para acessar dados do Google Meu Negócio de forma segura através do protocolo OAuth 2.0</li>
              <li><strong>Dashboard de Avaliações:</strong> Visualização centralizada de todas as avaliações recebidas, estatísticas e métricas de desempenho</li>
              <li><strong>Respostas a Avaliações:</strong> Interface para responder avaliações recebidas no Google Meu Negócio</li>
              <li><strong>Cadastro de Clientes:</strong> Gestão de informações de clientes e onboarding de novos usuários</li>
              <li><strong>Relatórios e Estatísticas:</strong> Métricas e insights sobre o desempenho da presença digital</li>
            </ul>
          </Section>

      <Section id="privacidade" title="Política de Privacidade">
        <p>
              Esta Política de Privacidade descreve como a Agência Elevea coleta, usa e protege suas informações pessoais quando você utiliza nossos serviços.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Dados Coletados</h3>
            <p>Coletamos as seguintes informações para operar nossos serviços:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informações de Perfil Google:</strong> Nome, e-mail e foto do perfil associados à sua conta Google</li>
              <li><strong>Dados do Google Meu Negócio:</strong> Informações do seu perfil de negócio, avaliações, horários de funcionamento e outras informações públicas disponíveis através da API do Google Business Profile</li>
              <li><strong>Informações de Contato:</strong> Nome, e-mail, telefone e WhatsApp fornecidos durante o cadastro</li>
              <li><strong>Dados de Uso:</strong> Registros de acesso, atividades na plataforma e interações com os serviços</li>
            </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">Finalidade do Uso de Dados</h3>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Autenticar e gerenciar seu acesso ao sistema através do Google OAuth</li>
              <li>Buscar e exibir informações do seu Google Meu Negócio</li>
              <li>Gerenciar avaliações recebidas e permitir respostas</li>
              <li>Fornecer suporte técnico e atendimento ao cliente</li>
              <li>Enviar comunicações transacionais sobre o serviço</li>
              <li>Melhorar e otimizar os serviços oferecidos</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Compartilhamento de Dados</h3>
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Compartilhamos dados apenas nas seguintes situações:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Provedores de Serviços:</strong> Com prestadores de serviços essenciais (hospedagem, e-mail) sob contrato de proteção de dados</li>
              <li><strong>Google LLC:</strong> Dados necessários para autenticação OAuth e acesso à API do Google Business Profile, conforme política do Google</li>
              <li><strong>Requisitos Legais:</strong> Quando exigido por lei, ordem judicial ou processo legal</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Segurança</h3>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
        </p>
      </Section>

      <Section id="termos" title="Termos de Serviço">
        <p>
              Ao utilizar os serviços da Agência Elevea, você concorda com os seguintes termos e condições:
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1. Uso Aceitável</h3>
            <p>Você concorda em:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter a segurança de suas credenciais de acesso</li>
              <li>Não realizar atividades ilícitas ou que violem direitos de terceiros</li>
              <li>Não tentar acessar sistemas ou dados não autorizados</li>
              <li>Não usar o serviço para spam ou comunicações não solicitadas</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Propriedade dos Dados</h3>
            <p>
              Você mantém todos os direitos sobre os dados do seu negócio. Acesso a dados via Google Meu Negócio segue as políticas e termos de serviço do Google.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Limitação de Responsabilidade</h3>
            <p>
              Os serviços são fornecidos "no estado em que se encontram". Não garantimos disponibilidade contínua ou ausência de erros. Não nos responsabilizamos por perdas indiretas, incidentais ou consequenciais.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Alterações nos Serviços</h3>
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte dos serviços a qualquer momento, com ou sem aviso prévio.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. Alterações nos Termos</h3>
            <p>
              Podemos atualizar estes termos periodicamente. Alterações significativas serão notificadas por e-mail ou através da plataforma. O uso continuado após as mudanças constitui aceitação dos novos termos.
        </p>
      </Section>

          <Section id="dados" title="Uso de Dados do Google Meu Negócio">
            <p>
              Nosso aplicativo solicita acesso aos seguintes dados do Google Meu Negócio:
            </p>
            
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="font-semibold mb-2">Permissões Solicitadas:</h4>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><strong>Read Reviews:</strong> Para buscar e exibir avaliações do seu negócio</li>
                <li><strong>Write Reviews:</strong> Para responder avaliações em seu nome</li>
                <li><strong>Read Business Profile:</strong> Para visualizar informações do perfil do negócio</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="font-semibold mb-2">Como Utilizamos os Dados:</h4>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Exibir avaliações em tempo real no dashboard</li>
                <li>Permitir que você responda avaliações diretamente pela plataforma</li>
                <li>Gerar estatísticas e relatórios sobre o desempenho do seu negócio</li>
                <li>Notificar sobre novas avaliações recebidas</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 className="font-semibold mb-2">Revogação de Acesso:</h4>
              <p className="text-sm">
                Você pode revogar o acesso ao Google Meu Negócio a qualquer momento através da API de revogação do Google ou entrando em contato conosco. Ao revogar, perderá acesso às funcionalidades relacionadas.
              </p>
            </div>
          </Section>

          <Section id="exclusao" title="Direito à Exclusão de Dados">
            <p>
              Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a solicitar a exclusão de seus dados pessoais.
            </p>
            
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-2">Como Solicitar:</h4>
              <p className="text-sm mb-2">
                Envie um e-mail para <a href="mailto:suporte@eleveaagencia.com.br" className="text-primary hover:underline">suporte@eleveaagencia.com.br</a> com:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Assunto: "Exclusão de Dados"</li>
                <li>Nome completo</li>
                <li>E-mail cadastrado</li>
                <li>Motivo da solicitação (opcional)</li>
              </ul>
            </div>

            <p className="mt-4">
              Processaremos sua solicitação em até 30 dias, observando a legislação aplicável.
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              <strong>Nota:</strong> Alguns dados podem ser mantidos por obrigações legais, prevenção de fraude ou resolução de disputas, conforme permitido por lei.
        </p>
      </Section>

          <Section id="contato" title="Contato e Suporte">
            <p>
              Para dúvidas sobre estas políticas, solicitações de dados ou suporte técnico, entre em contato conosco:
            </p>
            
            <div информации="mt-4 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-2">E-mail de Suporte</p>
                  <a href="mailto:suporte@eleveaagencia.com.br" className="text-primary hover:underline">
                    suporte@eleveaagencia.com.br
                  </a>
                </div>
                <div>
                  <p className="font-semibold mb-2">WhatsApp</p>
                  <a href="https://wa.me/5596981032928" className="text-primary hover:underline">
                    (96) 9 8103-2928
                  </a>
                </div>
                <div>
                  <p className="font-semibold mb-2">Instagram</p>
                  <a href="https://www.instagram.com/elevea.agencia" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    @elevea.agencia
                  </a>
                </div>
                <div>
                  <p className="font-semibold mb-2">Horário de Atendimento</p>
                  <p>Segunda a Sábado, 8h às 18h (horário de Brasília)</p>
                </div>
              </div>
            </div>
      </Section>

          <hr className="my-8 border-border" />

          <footer className="text-center text-muted-foreground text-sm">
            <p>© {year} Agência Elevea. Todos os direitos reservados.</p>
            <p className="mt-2">Esta página descreve como coletamos, usamos e protegemos seus dados pessoais.</p>
      </footer>
        </div>
    </main>
    </div>
  );
}

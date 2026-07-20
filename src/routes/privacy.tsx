import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Anfitrião" },
      { name: "description", content: "Conheça como o Anfitrião coleta, usa, armazena e protege dados pessoais." },
      { property: "og:title", content: "Política de Privacidade — Anfitrião" },
      { property: "og:description", content: "Conheça as práticas de privacidade do Concierge OS." },
    ],
  }),
  component: PrivacyPage,
});

const lastUpdated = "20 de julho de 2026";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-900 text-sm font-medium text-white">A</div>
            <span className="text-sm font-medium tracking-tight">Anfitrião</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">Entrar</Link>
            <Link to="/signup">
              <Button size="sm" className="rounded-sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta página é mantida por <strong>Anfitrião</strong> para responder perguntas comuns sobre privacidade e segurança. Ela não é uma certificação, auditoria independente ou parecer jurídico.
        </div>

        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Documento vivo</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: {lastUpdated}</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-medium text-slate-900">1. Quem somos</h2>
            <p className="mt-3">
              A Anfitrião é uma plataforma de concierge omnichannel que ajuda empresas a atender seus clientes pelos canais WhatsApp, Instagram, Facebook Messenger, e-mail e webchat. Esta política descreve como tratamos dados pessoais na nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">2. Dados pessoais coletados</h2>
            <p className="mt-3">Coletamos dados para operar a plataforma e permitir que nossos clientes atendam seus consumidores finais. Os dados podem incluir:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, senha e nome da empresa dos usuários da plataforma.</li>
              <li><strong>Dados de conversas:</strong> mensagens, anexos, chamadas e histórico de atendimento trocados pelos canais conectados.</li>
              <li><strong>Dados de contatos finais:</strong> nome, telefone, e-mail, identificadores de redes sociais e outras informações que o consumidor final fornecer durante o atendimento.</li>
              <li><strong>Dados contextuais:</strong> endereço de entrega, número de pedido, status de reembolso ou logística reversa, quando compartilhados pelo cliente ou por integrações.</li>
            </ul>
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <strong>Revisar:</strong> confirme se a lista acima reflete exatamente o que a operação coleta hoje. Edite em <code>src/routes/privacy.tsx</code>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">3. Como usamos os dados</h2>
            <p className="mt-3">Os dados são usados para:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Prestar o serviço de atendimento omnichannel e manter o histórico de conversas.</li>
              <li>Alimentar a base de conhecimento da IA concierge, limitado ao conteúdo autorizado pelo cliente.</li>
              <li>Executar automações de pós-venda, handoff humano e logística reversa.</li>
              <li>Enviar comunicações operacionais, como alertas de SLA e redefinição de senha.</li>
              <li>Melhorar a segurança, estabilidade e performance da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">4. Base legal e responsabilidades</h2>
            <p className="mt-3">
              O cliente da Anfitrião (controlador da operação) é responsável por obter as autorizações necessárias dos consumidores finais e por cumprir as leis aplicáveis. A Anfitrião atua como operadora, processando os dados conforme instruções do cliente e para viabilizar o serviço.
            </p>
            <p className="mt-3">
              A plataforma roda sobre a infraestrutura do Lovable Cloud (Supabase). A segurança da camada de hospedagem, banco de dados, autenticação e armazenamento é fornecida por essa plataforma; a segurança das configurações, permissões de usuários e conteúdo treinado na IA é responsabilidade do cliente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">5. Integrações e subprocessadores</h2>
            <p className="mt-3">Para funcionar, a plataforma pode enviar dados para os serviços abaixo, conforme configurado pelo cliente:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li><strong>Meta (Facebook/Instagram/WhatsApp):</strong> troca de mensagens através de APIs oficiais. O cliente configura o próprio app de desenvolvedor.</li>
              <li><strong>Chatwoot:</strong> inbox e gestão de conversas.</li>
              <li><strong>Dify:</strong> orquestração de IA e base de conhecimento RAG.</li>
              
              <li><strong>Evolution API:</strong> conexão com WhatsApp Business, quando habilitado.</li>
              <li><strong>Lovable Cloud / Supabase:</strong> banco de dados, autenticação e hospedagem.</li>
            </ul>
            <p className="mt-3">Cada integração é opcional e ativada pelo administrador. A lista de subprocessadores ativos pode variar por organização.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">6. Cookies e tecnologias semelhantes</h2>
            <p className="mt-3">Usamos cookies essenciais para autenticação, segurança e funcionamento da aplicação. Também usamos cookies/scripts de marketing para medir a eficácia de campanhas e entender a origem dos visitantes.</p>
            <p className="mt-3">Os cookies essenciais não podem ser desabilitados sem comprometer o funcionamento do app. As preferências de cookies de marketing podem ser gerenciadas no banner de cookies, quando apresentado.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">7. Retenção e exclusão</h2>
            <p className="mt-3">
              As conversas e dados de contatos são mantidos pelo tempo necessário para prestar o serviço ao cliente ou pelo prazo legal aplicável. Quando uma conta é encerrada, os dados são removidos ou anonimizados, salvo obrigações legais de retenção.
            </p>
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <strong>Revisar:</strong> defina o prazo exato de retenção (ex.: 12 meses, 5 anos) e substitua este parágrafo em <code>src/routes/privacy.tsx</code>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">8. Segurança</h2>
            <p className="mt-3">Adotamos práticas de segurança em camadas:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Autenticação por e-mail/senha ou Google, com sessões expiráveis.</li>
              <li>Isolamento de dados entre organizações (RLS) dentro do banco de dados.</li>
              <li>Tokens de API armazenados de forma segura e nunca expostos no frontend.</li>
              <li>Comunicação criptografada via HTTPS entre cliente, servidor e integrações.</li>
            </ul>
            <p className="mt-3">
              Nenhum sistema é 100% seguro. Em caso de incidente que afete dados pessoais, notificaremos os clientes conforme exigido pelas leis aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">9. Seus direitos</h2>
            <p className="mt-3">Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados pessoais. Para usuários da plataforma (administradores/agentes), ajustes podem ser feitos em <strong>Perfil</strong> ou por contato direto. Para consumidores finais atendidos por um cliente da Anfitrião, o pedido deve ser feito diretamente ao cliente da operação.</p>
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <strong>Revisar:</strong> substitua este texto pelo e-mail oficial de privacidade (ex.: <code>privacidade@anfitriao.app.br</code>) em <code>src/routes/privacy.tsx</code>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">10. Reporte de vulnerabilidades</h2>
            <p className="mt-3">
              Se você encontrar uma falha de segurança, pedimos que reporte de forma responsável para o e-mail de segurança da operação. Não explore, abuse ou exponha dados de terceiros ao validar a vulnerabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-slate-900">11. Alterações nesta política</h2>
            <p className="mt-3">Esta política pode ser atualizada para refletir mudanças na plataforma ou nas leis aplicáveis. A data da última revisão aparece no topo da página. Alterações materiais serão comunicadas aos clientes cadastrados.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500 md:flex-row">
          <span>© {new Date().getFullYear()} Anfitrião · Concierge OS</span>
          <div className="flex gap-6">
            <Link to="/privacidade" className="hover:text-slate-900">Privacidade</Link>
            <Link to="/login">Entrar</Link>
            <Link to="/signup">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

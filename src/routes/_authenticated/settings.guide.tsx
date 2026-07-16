import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/guide")({
  head: () => ({ meta: [{ title: "Manual de Integrações — Anfitrião" }] }),
  component: GuidePage,
});

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
        {n}
      </span>
      <div className="flex-1 pt-0.5 text-sm text-slate-700 leading-relaxed">{children}</div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
      {children}
    </code>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-md border border-border/60 bg-white p-6">
      <h2 className="text-base font-medium text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-slate-900">
            Manual de Integrações
          </h1>
          <p className="text-sm text-slate-500">
            Passo a passo para obter as credenciais de cada serviço.
          </p>
        </div>
        <Link
          to="/settings/integrations"
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <nav className="rounded-md border border-border/60 bg-slate-50 p-4 text-sm">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Conteúdo
        </div>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li><a href="#prereqs" className="text-slate-700 hover:underline">0. Pré-requisitos da VPS</a></li>
          <li><a href="#chatwoot" className="text-slate-700 hover:underline">1. Chatwoot</a></li>
          <li><a href="#evolution" className="text-slate-700 hover:underline">2. Evolution API (WhatsApp)</a></li>
          <li><a href="#meta" className="text-slate-700 hover:underline">3. Instagram e Facebook</a></li>
          <li><a href="#dify" className="text-slate-700 hover:underline">4. Dify (RAG)</a></li>
          <li><a href="#n8n" className="text-slate-700 hover:underline">5. n8n (Webhooks)</a></li>
          <li><a href="#context" className="text-slate-700 hover:underline">6. Contexto do cliente (ML/site/loja)</a></li>
        </ul>
      </nav>

      <Section
        id="prereqs"
        title="0. Pré-requisitos"
        subtitle="Antes de configurar as integrações, garanta que a stack está no ar."
      >
        <ol className="space-y-3">
          <Step n={1}>
            VPS com Docker rodando a stack (<Code>infra/docker-compose.yml</Code> deste repositório). Veja{" "}
            <Code>infra/README.md</Code> para o bootstrap.
          </Step>
          <Step n={2}>
            DNS apontando 4 subdomínios para a VPS:{" "}
            <Code>chat.seudominio</Code>, <Code>evo.seudominio</Code>,{" "}
            <Code>dify.seudominio</Code>, <Code>n8n.seudominio</Code>.
          </Step>
          <Step n={3}>
            Confirme com <Code>bash infra/scripts/validate.sh</Code> — todos checks devem passar.
          </Step>
        </ol>
      </Section>

      <Section
        id="chatwoot"
        title="1. Chatwoot"
        subtitle="Plataforma omnichannel onde as conversas são centralizadas."
      >
        <ol className="space-y-3">
          <Step n={1}>
            Acesse <Code>https://chat.seudominio.com.br</Code> e crie a conta de admin (primeiro usuário).
          </Step>
          <Step n={2}>
            <strong>URL base</strong>: copie a URL acima (sem barra no final).
          </Step>
          <Step n={3}>
            <strong>User Token</strong>: clique no avatar (canto inferior esquerdo) →{" "}
            <em>Profile Settings</em> → role até <em>Access Token</em> → copie.
          </Step>
          <Step n={4}>
            <strong>Account ID</strong>: olhe a URL ao navegar pelo painel — algo como{" "}
            <Code>/app/accounts/1/...</Code>. O número é o Account ID (geralmente <Code>1</Code>).
          </Step>
          <Step n={5}>
            <strong>Inbox ID</strong> (opcional): <em>Settings → Inboxes → Add Inbox → API</em>. Após criar,
            o ID aparece na URL <Code>/settings/inboxes/&lt;id&gt;</Code>.
          </Step>
          <Step n={6}>
            Cole tudo em <Link to="/settings/integrations" className="text-blue-600 hover:underline">Integrações → Chatwoot</Link> e salve.
          </Step>
        </ol>
        <a
          href="https://www.chatwoot.com/docs/product/channels/api/create-channel"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          Documentação oficial <ExternalLink className="h-3 w-3" />
        </a>
      </Section>

      <Section
        id="evolution"
        title="2. Evolution API (WhatsApp)"
        subtitle="Conecta um número de WhatsApp via Baileys."
      >
        <ol className="space-y-3">
          <Step n={1}>
            <strong>URL base</strong>: <Code>https://evo.seudominio.com.br</Code>.
          </Step>
          <Step n={2}>
            <strong>API Key</strong>: o valor da variável <Code>EVOLUTION_API_KEY</Code> definida no{" "}
            <Code>infra/.env</Code> da VPS. Se não souber, gere uma nova com{" "}
            <Code>openssl rand -hex 24</Code>, atualize o <Code>.env</Code> e rode{" "}
            <Code>docker compose up -d</Code>.
          </Step>
          <Step n={3}>
            <strong>Nome da instância</strong>: escolha um nome curto sem espaços, ex.{" "}
            <Code>principal</Code>. Crie a instância rodando na VPS:
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-[12px] text-slate-100">
{`export $(grep -v '^#' /opt/host-ai-concierge/infra/.env | xargs)
bash /opt/host-ai-concierge/infra/evolution/create-instance.sh principal`}
            </pre>
          </Step>
          <Step n={4}>
            O comando acima imprime um QR code — escaneie no celular em{" "}
            <em>WhatsApp → Aparelhos conectados</em>.
          </Step>
          <Step n={5}>
            Cole tudo em <Link to="/settings/integrations" className="text-blue-600 hover:underline">Integrações → Evolution</Link> e salve.
          </Step>
        </ol>
      </Section>

      <Section
        id="dify"
        title="3. Dify (RAG)"
        subtitle="Base de conhecimento e completion da IA."
      >
        <ol className="space-y-3">
          <Step n={1}>
            Acesse <Code>https://dify.seudominio.com.br</Code> e crie a conta admin.
          </Step>
          <Step n={2}>
            <strong>URL base</strong>: a URL acima (sem barra final).
          </Step>
          <Step n={3}>
            <strong>Dataset ID</strong>: <em>Knowledge → Create Knowledge</em> → escolha um nome →{" "}
            após criar, copie o ID que aparece na URL{" "}
            <Code>/datasets/&lt;dataset-id&gt;/documents</Code>.
          </Step>
          <Step n={4}>
            <strong>API Key</strong>: crie um <em>App</em> (Studio → Create from Blank → Chatbot) →{" "}
            <em>API Access</em> → <em>API Key</em> → <em>Create new secret key</em>.
          </Step>
          <Step n={5}>
            Cole tudo em <Link to="/settings/integrations" className="text-blue-600 hover:underline">Integrações → Dify</Link> e salve. Depois faça upload das primeiras FAQs em <Link to="/brain" className="text-blue-600 hover:underline">Cérebro</Link>.
          </Step>
        </ol>
        <a
          href="https://docs.dify.ai/guides/knowledge-base/maintain-knowledge-base-via-api"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          Documentação oficial <ExternalLink className="h-3 w-3" />
        </a>
      </Section>

      <Section
        id="n8n"
        title="4. n8n (Webhooks)"
        subtitle="Orquestra handoff humano, logística reversa e o pipeline RAG."
      >
        <ol className="space-y-3">
          <Step n={1}>
            Acesse <Code>https://n8n.seudominio.com.br</Code> (basic auth definido no{" "}
            <Code>infra/.env</Code>).
          </Step>
          <Step n={2}>
            <em>Workflows → Import from File</em> e importe os 3 JSONs de{" "}
            <Code>n8n-workflows/</Code>:
            <ul className="mt-1 list-disc pl-5 text-slate-600">
              <li><Code>whatsapp-rag-chatwoot.json</Code></li>
              <li><Code>handoff.json</Code></li>
              <li><Code>reverse-logistics.json</Code></li>
            </ul>
          </Step>
          <Step n={3}>
            Em cada workflow, abra o nó <em>Webhook</em>, copie a <strong>Production URL</strong> e
            ative o workflow (toggle <em>Active</em> no canto superior).
          </Step>
          <Step n={4}>
            No n8n: <em>Settings → Variables</em> e configure as credenciais do Chatwoot, Evolution
            e Dify (mesmas do passo anterior). Veja a lista completa em{" "}
            <Code>n8n-workflows/README.md</Code>.
          </Step>
          <Step n={5}>
            Cole as 3 URLs em{" "}
            <Link to="/settings/integrations" className="text-blue-600 hover:underline">
              Integrações → n8n
            </Link>{" "}
            e salve.
          </Step>
          <Step n={6}>
            <strong>Token (opcional)</strong>: se você protegeu os webhooks com header de
            autenticação, defina o mesmo valor aqui — ele será enviado no header{" "}
            <Code>Authorization: Bearer …</Code>.
          </Step>
        </ol>
      </Section>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Pronto! Quando os 4 cards de <Link to="/settings/integrations" className="font-medium underline">Integrações</Link> aparecerem como <strong>Configurado</strong>, o Anfitrião está operacional. Mande uma mensagem de teste para o WhatsApp conectado e acompanhe a conversa no <Link to="/inbox" className="font-medium underline">Inbox</Link>.
      </div>
    </div>
  );
}

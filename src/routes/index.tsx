import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Brain, Zap, Shield, Globe, Workflow, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anfitrião — Concierge OS para atendimento omnichannel" },
      { name: "description", content: "Atenda WhatsApp, Instagram, Email e Webchat em um só lugar. IA concierge e base de conhecimento RAG. Trate seu cliente como hóspede." },
      { property: "og:title", content: "Anfitrião — Concierge OS" },
      { property: "og:description", content: "IA concierge omnichannel. WhatsApp, Instagram, Email, Webchat." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-900 text-sm font-medium text-white">A</div>
            <span className="text-sm font-medium tracking-tight">Anfitrião</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Funcionalidades</a>
            <a href="#how" className="hover:text-slate-900">Como funciona</a>
            <a href="#channels" className="hover:text-slate-900">Canais</a>
            <a href="#pricing" className="hover:text-slate-900">Planos</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">Entrar</Link>
            <Link to="/signup">
              <Button size="sm" className="rounded-sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-slate-500">Concierge OS · Omnichannel · IA</p>
          <h1 className="mx-auto max-w-3xl text-5xl font-medium leading-tight tracking-tight text-slate-900 md:text-6xl">
            Trate seu cliente como hóspede. Em todos os canais.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Plataforma omnichannel com IA concierge para WhatsApp, Instagram, Email e Webchat. Reduza transbordos humanos, escale sem perder a alma da sua marca.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="rounded-sm gap-2">Começar grátis <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="rounded-sm">Já tenho conta</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">Sem cartão de crédito · Setup em minutos</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Funcionalidades</p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Tudo que sua operação de atendimento precisa</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: MessageSquare, t: "Inbox unificada", d: "WhatsApp, Instagram, Email e Webchat numa só caixa, com histórico completo do cliente." },
              { icon: Brain, t: "IA concierge com RAG", d: "Sua marca treina o cérebro. Respostas baseadas na sua base de conhecimento, no seu tom de voz." },
              { icon: Workflow, t: "Automações n8n", d: "Handoff humano, logística reversa e fluxos customizados rodando em workflows visuais." },
              { icon: Zap, t: "Tempo real", d: "Eventos via WebSocket. O time vê e responde no mesmo segundo que o cliente fala." },
              { icon: Shield, t: "Multi-tenant seguro", d: "Cada cliente isolado por RLS. Sem vazamento de dados entre operações." },
              { icon: Globe, t: "White-label", d: "Sua marca, seu domínio. Conecte os canais sem sair do app." },
            ].map((f) => (
              <div key={f.t} className="rounded-sm border border-border/60 p-6">
                <f.icon className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
                <h3 className="mt-4 text-base font-medium">{f.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-b border-border/60 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Como funciona</p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Em três passos você está atendendo</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Conecte seus canais", d: "Em /channels, conecte WhatsApp via QR, Instagram via OAuth, Email via IMAP/SMTP e gere o snippet do webchat." },
              { n: "02", t: "Treine o concierge", d: "Em /brain, suba documentos, FAQs e políticas. A IA passa a responder no seu tom de voz." },
              { n: "03", t: "Atenda e automatize", d: "Acompanhe tudo na inbox em tempo real. Configure workflows de handoff e pós-venda." },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{s.n}</div>
                <h3 className="mt-2 text-lg font-medium">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="channels" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Canais</p>
          <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Onde seus clientes estão</h2>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
            {["WhatsApp", "Instagram", "Email", "Webchat"].map((c) => (
              <div key={c} className="rounded-sm border border-border/60 px-4 py-6 text-sm font-medium">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border/60 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Planos</p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Comece grátis. Cresça quando quiser.</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { n: "Starter", p: "Grátis", d: "Para validar a operação", f: ["1 canal", "500 conversas/mês", "1 usuário"] },
              { n: "Growth", p: "R$ 497/mês", d: "Para times em escala", f: ["Todos os canais", "10k conversas", "5 usuários", "RAG ilimitado"], hi: true },
              { n: "Brand", p: "Sob consulta", d: "Para marcas premium", f: ["Volume ilimitado", "White-label", "SLA dedicado", "Onboarding 1:1"] },
            ].map((p) => (
              <div key={p.n} className={`rounded-sm border p-6 ${p.hi ? "border-slate-900 bg-white" : "border-border/60 bg-white"}`}>
                <h3 className="text-base font-medium">{p.n}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.d}</p>
                <p className="mt-4 text-2xl font-medium">{p.p}</p>
                <ul className="mt-6 space-y-2">
                  {p.f.map((x) => (
                    <li key={x} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 text-slate-900" strokeWidth={1.5} /> {x}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-6 block">
                  <Button variant={p.hi ? "default" : "outline"} className="w-full rounded-sm">Começar</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">FAQ</p>
          <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Dúvidas frequentes</h2>
          <div className="mt-10 space-y-6">
            {[
              { q: "Preciso instalar algo?", a: "Não. Tudo roda no navegador. Para o webchat, basta colar um snippet no seu site." },
              { q: "Como conecto o WhatsApp?", a: "Via Evolution API com QR Code, direto em /channels. Leva menos de 1 minuto." },
              { q: "Meus dados ficam isolados?", a: "Sim. Cada cliente tem seu workspace, isolado por Row-Level Security no banco." },
              { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade, sem multa. Você exporta seus dados a qualquer momento." },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-medium">{f.q}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Pronto para elevar o atendimento?</h2>
          <p className="mt-4 text-slate-600">Crie sua conta agora. Conecte o primeiro canal em minutos.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="rounded-sm gap-2">Começar grátis <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500 md:flex-row">
          <span>© {new Date().getFullYear()} Anfitrião · Concierge OS</span>
          <div className="flex gap-6">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/login">Entrar</Link>
            <Link to="/signup">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

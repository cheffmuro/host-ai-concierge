import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle, Instagram, Mail, Globe, Plus, Trash2, Copy, Check,
  Loader2, QrCode, ShieldCheck, Plug,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  listChannels, deleteChannel,
  createWhatsAppChannel, getWhatsAppStatus,
  createEmailChannel, createWebchatChannel,
  getWebchatSnippet, channelsConfig,
  type ChannelConnection, type ChannelKind,
} from "@/services/channelsService";

export const Route = createFileRoute("/channels")({
  head: () => ({
    meta: [
      { title: "Canais — Anfitrião" },
      { name: "description", content: "Conecte WhatsApp, Instagram, e-mail e widget de site num só lugar." },
      { property: "og:title", content: "Canais — Anfitrião" },
      { property: "og:description", content: "Conecte todos os seus canais de atendimento em poucos cliques." },
    ],
  }),
  component: ChannelsPage,
});

const meta: Record<ChannelKind, { label: string; icon: typeof MessageCircle; description: string; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, description: "Receba e responda mensagens via WhatsApp Business.", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  instagram: { label: "Instagram Direct", icon: Instagram, description: "Atenda DMs do Instagram da sua marca.", color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200" },
  email: { label: "E-mail", icon: Mail, description: "Caixa de e-mail compartilhada via IMAP/SMTP.", color: "text-sky-600 bg-sky-50 border-sky-200" },
  webchat: { label: "Widget no site", icon: Globe, description: "Chat ao vivo embutido no seu site.", color: "text-amber-600 bg-amber-50 border-amber-200" },
};

function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWizard, setOpenWizard] = useState<ChannelKind | null>(null);
  const [snippet, setSnippet] = useState<{ name: string; token: string } | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setChannels(await listChannels());
    } catch (e) {
      toast.error("Falha ao carregar canais", { description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const grouped = (kind: ChannelKind) => channels.filter((c) => c.kind === kind);

  const handleDelete = async (id: string) => {
    try {
      await deleteChannel(id);
      toast.success("Canal removido");
      refresh();
    } catch (e) {
      toast.error("Erro ao remover", { description: String(e) });
    }
  };

  const handleConnected = (created?: ChannelConnection) => {
    setOpenWizard(null);
    refresh();
    if (created?.kind === "webchat" && created.websiteToken) {
      setSnippet({ name: created.name, token: created.websiteToken });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Canais</h1>
        <p className="text-sm text-slate-500 mt-1">
          Conecte os canais por onde seus clientes falam com você. Tudo aparece numa única caixa de entrada.
        </p>
      </div>

      {!channelsConfig.isLive && (
        <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <ShieldCheck className="h-4 w-4 mt-0.5" strokeWidth={1.5} />
          <div>
            <strong className="font-medium">Modo demonstração.</strong> Conexões criadas aqui são simuladas. Configure
            <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5">VITE_CHATWOOT_URL</code>
            para ativar o modo real.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(meta) as ChannelKind[]).map((kind) => {
          const m = meta[kind];
          const list = grouped(kind);
          const Icon = m.icon;
          return (
            <Card key={kind} className="rounded-sm border-border/60 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-sm border ${m.color}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium text-slate-900">{m.label}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-sm h-8 gap-1.5 border-border/60 shrink-0"
                  onClick={() => setOpenWizard(kind)}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Conectar
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="text-xs text-slate-400 italic">Carregando…</div>
                ) : list.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">Nenhuma conexão ativa.</div>
                ) : (
                  <ul className="space-y-2">
                    {list.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 rounded-sm border border-border/60 bg-white px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
                          {c.identifier && (
                            <div className="text-[11px] text-slate-500 truncate">{c.identifier}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`rounded-sm font-normal text-[10px] ${
                            c.status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : c.status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}>
                            {c.status === "connected" ? "Conectado" : c.status === "pending" ? "Pendente" : "Desconectado"}
                          </Badge>
                          {c.kind === "webchat" && c.websiteToken && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSnippet({ name: c.name, token: c.websiteToken! })} aria-label="Ver snippet">
                              <Globe className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.5} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rose-600" onClick={() => handleDelete(c.id)} aria-label="Remover">
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Wizards */}
      <Sheet open={openWizard === "whatsapp"} onOpenChange={(o) => !o && setOpenWizard(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <WhatsAppWizard onDone={handleConnected} />
        </SheetContent>
      </Sheet>

      <Sheet open={openWizard === "email"} onOpenChange={(o) => !o && setOpenWizard(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <EmailWizard onDone={handleConnected} />
        </SheetContent>
      </Sheet>

      <Sheet open={openWizard === "webchat"} onOpenChange={(o) => !o && setOpenWizard(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <WebchatWizard onDone={handleConnected} />
        </SheetContent>
      </Sheet>

      <Sheet open={openWizard === "instagram"} onOpenChange={(o) => !o && setOpenWizard(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <InstagramWizard />
        </SheetContent>
      </Sheet>

      {/* Snippet modal-like sheet */}
      <Sheet open={!!snippet} onOpenChange={(o) => !o && setSnippet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {snippet && <SnippetView name={snippet.name} token={snippet.token} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ===== WhatsApp Wizard ======================================================
function WhatsAppWizard({ onDone }: { onDone: (c?: ChannelConnection) => void }) {
  const [name, setName] = useState("WhatsApp Atendimento");
  const [step, setStep] = useState<"form" | "qr" | "done">("form");
  const [qr, setQr] = useState<string>("");
  const [instance, setInstance] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step !== "qr" || !instance) return;
    const id = setInterval(async () => {
      const status = await getWhatsAppStatus(instance);
      if (status === "connected") {
        clearInterval(id);
        setStep("done");
        toast.success("WhatsApp conectado!");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [step, instance]);

  const start = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const r = await createWhatsAppChannel(name.trim());
      setQr(r.qrCode);
      setInstance(r.instanceName);
      setStep("qr");
    } catch (e) {
      toast.error("Falha ao gerar QR", { description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-emerald-600" strokeWidth={1.5} /> Conectar WhatsApp
        </SheetTitle>
        <SheetDescription>
          {step === "form" && "Dê um nome para essa conexão. Em seguida você vai escanear um QR Code com o WhatsApp do número que vai atender."}
          {step === "qr" && "Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho. Aponte para o QR abaixo."}
          {step === "done" && "Tudo pronto. Mensagens novas vão aparecer na sua Caixa."}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        {step === "form" && (
          <>
            <div>
              <Label htmlFor="wa-name" className="text-[11px] uppercase tracking-wider text-slate-500">Nome da conexão</Label>
              <Input id="wa-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 rounded-sm border-border/60" />
            </div>
            <Button onClick={start} disabled={submitting} className="w-full rounded-sm bg-slate-900 hover:bg-slate-800 gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" strokeWidth={1.5} />}
              Gerar QR Code
            </Button>
          </>
        )}

        {step === "qr" && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-sm border border-border/60 bg-white p-3">
              {qr ? (
                <img src={qr} alt="QR Code WhatsApp" className="h-60 w-60" />
              ) : (
                <div className="flex h-60 w-60 items-center justify-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando leitura do QR…
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-6 w-6" strokeWidth={2} />
            </div>
            <p className="text-sm text-slate-700">WhatsApp conectado com sucesso.</p>
            <Button onClick={() => onDone()} className="rounded-sm bg-slate-900 hover:bg-slate-800">Concluir</Button>
          </div>
        )}
      </div>
    </>
  );
}

// ===== Email Wizard =========================================================
function EmailWizard({ onDone }: { onDone: (c?: ChannelConnection) => void }) {
  const [form, setForm] = useState({
    name: "Atendimento", email: "", imapHost: "", imapPort: 993, imapUser: "",
    imapPassword: "", smtpHost: "", smtpPort: 587,
  });
  const [submitting, setSubmitting] = useState(false);
  const update = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.imapHost || !form.imapUser || !form.imapPassword) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createEmailChannel(form);
      toast.success("E-mail conectado");
      onDone(created);
    } catch (e) {
      toast.error("Falha ao conectar", { description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-sky-600" strokeWidth={1.5} /> Conectar e-mail
        </SheetTitle>
        <SheetDescription>
          Configure IMAP (recebimento) e SMTP (envio). Use uma senha de app se sua conta tiver autenticação em duas etapas.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-3">
        <Field label="Nome interno" value={form.name} onChange={(v) => update("name", v)} />
        <Field label="E-mail" placeholder="atendimento@suaempresa.com" value={form.email} onChange={(v) => update("email", v)} />
        <Separator className="my-3" />
        <div className="text-[11px] uppercase tracking-wider text-slate-500">IMAP (recebe)</div>
        <Field label="Servidor IMAP" placeholder="imap.gmail.com" value={form.imapHost} onChange={(v) => update("imapHost", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Porta" type="number" value={String(form.imapPort)} onChange={(v) => update("imapPort", Number(v))} />
          <Field label="Usuário" value={form.imapUser} onChange={(v) => update("imapUser", v)} />
        </div>
        <Field label="Senha" type="password" value={form.imapPassword} onChange={(v) => update("imapPassword", v)} />
        <Separator className="my-3" />
        <div className="text-[11px] uppercase tracking-wider text-slate-500">SMTP (envia)</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Servidor SMTP" placeholder="smtp.gmail.com" value={form.smtpHost} onChange={(v) => update("smtpHost", v)} />
          <Field label="Porta" type="number" value={String(form.smtpPort)} onChange={(v) => update("smtpPort", Number(v))} />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full mt-4 rounded-sm bg-slate-900 hover:bg-slate-800 gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e conectar
        </Button>
      </div>
    </>
  );
}

// ===== Webchat Wizard =======================================================
function WebchatWizard({ onDone }: { onDone: (c?: ChannelConnection) => void }) {
  const [form, setForm] = useState({
    name: "Site", websiteUrl: "", primaryColor: "#0F172A",
    welcomeTitle: "Olá! Como podemos ajudar?", welcomeTagline: "Respondemos em poucos minutos.",
  });
  const [submitting, setSubmitting] = useState(false);
  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.websiteUrl) { toast.error("Informe a URL do site."); return; }
    setSubmitting(true);
    try {
      const created = await createWebchatChannel(form);
      toast.success("Widget criado", { description: "Copie o snippet e cole no <head> do seu site." });
      onDone(created);
    } catch (e) {
      toast.error("Falha ao criar widget", { description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-amber-600" strokeWidth={1.5} /> Widget no site
        </SheetTitle>
        <SheetDescription>
          Geramos um snippet pronto pra colar no seu site. Funciona em qualquer página HTML, WordPress, Shopify, etc.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-3">
        <Field label="Nome interno" value={form.name} onChange={(v) => update("name", v)} />
        <Field label="URL do site" placeholder="https://suaempresa.com" value={form.websiteUrl} onChange={(v) => update("websiteUrl", v)} />
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-slate-500">Cor principal</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-14 rounded-sm border-border/60 p-1" />
            <Input value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 rounded-sm border-border/60 font-mono text-xs" />
          </div>
        </div>
        <Field label="Título de boas-vindas" value={form.welcomeTitle} onChange={(v) => update("welcomeTitle", v)} />
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-slate-500">Subtítulo</Label>
          <Textarea value={form.welcomeTagline} onChange={(e) => update("welcomeTagline", e.target.value)} className="mt-1 rounded-sm border-border/60 min-h-[60px]" />
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full mt-3 rounded-sm bg-slate-900 hover:bg-slate-800 gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Criar widget
        </Button>
      </div>
    </>
  );
}

// ===== Instagram (placeholder) ==============================================
function InstagramWizard() {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-base">
          <Instagram className="h-4 w-4 text-fuchsia-600" strokeWidth={1.5} /> Conectar Instagram
        </SheetTitle>
        <SheetDescription>
          A conexão com Instagram Direct depende da aprovação do app na Meta (Facebook for Developers).
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div className="rounded-sm border border-border/60 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
          <div className="font-medium text-slate-900">Pré-requisitos</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Conta Instagram Business ou Creator</li>
            <li>Página do Facebook conectada à conta Instagram</li>
            <li>Permissões <code className="rounded bg-white px-1">instagram_basic</code> e <code className="rounded bg-white px-1">pages_messaging</code></li>
          </ul>
        </div>
        <Button disabled className="w-full rounded-sm bg-slate-900 gap-2">
          <Plug className="h-4 w-4" strokeWidth={1.5} /> Autorizar com Facebook (em breve)
        </Button>
        <p className="text-[11px] text-slate-500 text-center">
          Enquanto isso, fale com a gente para liberarmos manualmente.
        </p>
      </div>
    </>
  );
}

// ===== Snippet view =========================================================
function SnippetView({ name, token }: { name: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const code = getWebchatSnippet(token);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Snippet copiado");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-base">Snippet — {name}</SheetTitle>
        <SheetDescription>Cole este código antes do fechamento da tag <code>&lt;/body&gt;</code> do seu site.</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-3">
        <pre className="max-h-[420px] overflow-auto rounded-sm border border-border/60 bg-slate-900 p-3 text-[11px] text-slate-100 font-mono">
{code}
        </pre>
        <Button onClick={copy} className="w-full rounded-sm bg-slate-900 hover:bg-slate-800 gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
          {copied ? "Copiado" : "Copiar snippet"}
        </Button>
      </div>
    </>
  );
}

// ===== Atom =================================================================
function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wider text-slate-500">{label}</Label>
      <Input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 rounded-sm border-border/60" />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Workflow as WorkflowIcon, CheckCircle2, XCircle, AlertCircle, Loader2, Download, Play, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  WORKFLOWS,
  callWebhook,
  validateWebhook,
  type WebhookResult,
  type WorkflowKey,
  type WorkflowMeta,
} from "@/services/n8nService";

export const Route = createFileRoute("/workflows")({
  head: () => ({
    meta: [
      { title: "Workflows n8n — Anfitrião" },
      { name: "description", content: "Importe, valide e ative os workflows n8n do Concierge OS." },
    ],
  }),
  component: WorkflowsPage,
});

type ResultMap = Partial<Record<WorkflowKey, { mode: "validate" | "real"; result: WebhookResult; at: string }>>;
type LoadingMap = Partial<Record<WorkflowKey, "validate" | "real" | undefined>>;

function statusBadge(wf: WorkflowMeta, entry: ResultMap[WorkflowKey]) {
  if (!wf.url) return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> não configurado</Badge>;
  if (!entry) return <Badge variant="secondary">desconhecido</Badge>;
  if (entry.result.ok) return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> conectado</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> falhou</Badge>;
}

function WorkflowsPage() {
  const [results, setResults] = useState<ResultMap>({});
  const [loading, setLoading] = useState<LoadingMap>({});

  const connected = useMemo(
    () => WORKFLOWS.filter((w) => results[w.key]?.result.ok).length,
    [results],
  );

  async function runValidate(wf: WorkflowMeta) {
    if (!wf.url) {
      toast.error(`Defina ${wf.envVar} para validar este workflow.`);
      return;
    }
    setLoading((l) => ({ ...l, [wf.key]: "validate" }));
    const result = await validateWebhook(wf.url);
    setResults((r) => ({ ...r, [wf.key]: { mode: "validate", result, at: new Date().toISOString() } }));
    setLoading((l) => ({ ...l, [wf.key]: undefined }));
    if (result.ok) toast.success(`${wf.label}: webhook respondeu ${result.status} em ${result.ms}ms`);
    else toast.error(`${wf.label}: ${result.error ?? `status ${result.status}`}`);
  }

  async function runReal(wf: WorkflowMeta) {
    if (!wf.url) {
      toast.error(`Defina ${wf.envVar} para ativar este workflow.`);
      return;
    }
    setLoading((l) => ({ ...l, [wf.key]: "real" }));
    const result = await callWebhook(wf.url, wf.samplePayload);
    setResults((r) => ({ ...r, [wf.key]: { mode: "real", result, at: new Date().toISOString() } }));
    setLoading((l) => ({ ...l, [wf.key]: undefined }));
    if (result.ok) toast.success(`${wf.label}: payload aceito (${result.status})`);
    else toast.error(`${wf.label}: ${result.error ?? `status ${result.status}`}`);
  }

  async function validateAll() {
    for (const wf of WORKFLOWS) {
      if (wf.url) await runValidate(wf);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <WorkflowIcon className="h-3.5 w-3.5" /> Integração
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflows n8n</h1>
        <p className="text-sm text-muted-foreground">
          Importe os JSONs no seu n8n self-hosted, valide os webhooks e dispare um payload real para confirmar a integração ponta a ponta.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Resumo</CardTitle>
            <CardDescription>
              {connected} de {WORKFLOWS.length} workflows conectados nesta sessão.
            </CardDescription>
          </div>
          <Button onClick={validateAll} variant="outline" size="sm" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Validar todos
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {WORKFLOWS.map((wf) => {
          const entry = results[wf.key];
          const busy = loading[wf.key];
          return (
            <Card key={wf.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{wf.label}</CardTitle>
                    <CardDescription>{wf.description}</CardDescription>
                    <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
                      {wf.url ?? `${wf.envVar} (vazio) · ${wf.webhookPath}`}
                    </code>
                  </div>
                  {statusBadge(wf, entry)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => runValidate(wf)}
                    disabled={!wf.url || !!busy}
                  >
                    {busy === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Validar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => runReal(wf)}
                    disabled={!wf.url || !!busy}
                  >
                    {busy === "real" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Testar com payload real
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-2">
                    <a href={wf.jsonPath} download>
                      <Download className="h-4 w-4" /> Baixar JSON
                    </a>
                  </Button>
                </div>

                {entry && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between text-muted-foreground">
                      <span>
                        último teste: {entry.mode === "validate" ? "ping" : "payload real"} · status {entry.result.status || "—"} · {entry.result.ms}ms
                      </span>
                      <span>{new Date(entry.at).toLocaleTimeString()}</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">
                      {entry.result.error
                        ? `erro: ${entry.result.error}`
                        : entry.result.body || "(resposta vazia)"}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como importar no n8n</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Baixe o JSON acima e abra <code className="rounded bg-muted px-1">n8n → Workflows → Import from File</code>.</p>
          <p>2. Preencha as variáveis (Chatwoot, Dify, Evolution) em <code className="rounded bg-muted px-1">Settings → Variables</code>.</p>
          <p>3. Ative o workflow (toggle <strong>Active</strong>) e copie a URL do webhook.</p>
          <p>4. Configure as variáveis <code className="rounded bg-muted px-1">VITE_N8N_WEBHOOK_*</code> no projeto e use os botões acima para validar.</p>
        </CardContent>
      </Card>
    </div>
  );
}

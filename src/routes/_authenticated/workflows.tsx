import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Workflow as WorkflowIcon, CheckCircle2, XCircle, AlertCircle, Loader2, Download, Play, ShieldCheck, Save, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  WORKFLOWS,
  callWebhook,
  validateWebhook,
  getWorkflowUrl,
  setWorkflowUrl,
  getWebhookToken,
  setWebhookToken,
  type WebhookResult,
  type WorkflowKey,
  type WorkflowMeta,
} from "@/services/n8nService";

export const Route = createFileRoute("/_authenticated/workflows")({
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
type UrlMap = Record<WorkflowKey, string>;

function statusBadge(url: string | undefined, entry: ResultMap[WorkflowKey]) {
  if (!url) return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> não configurado</Badge>;
  if (!entry) return <Badge variant="secondary">configurado</Badge>;
  if (entry.result.ok) return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> conectado</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> falhou</Badge>;
}

function WorkflowsPage() {
  const [results, setResults] = useState<ResultMap>({});
  const [loading, setLoading] = useState<LoadingMap>({});
  const [urls, setUrls] = useState<UrlMap>({
    "handoff": "",
    "reverse-logistics": "",
    "whatsapp-rag-chatwoot": "",
  });
  const [token, setToken] = useState("");

  // Hydrate from localStorage / env on mount
  useEffect(() => {
    const next: UrlMap = {
      "handoff": getWorkflowUrl("handoff") ?? "",
      "reverse-logistics": getWorkflowUrl("reverse-logistics") ?? "",
      "whatsapp-rag-chatwoot": getWorkflowUrl("whatsapp-rag-chatwoot") ?? "",
    };
    setUrls(next);
    setToken(getWebhookToken() ?? "");
  }, []);

  const connected = useMemo(
    () => WORKFLOWS.filter((w) => results[w.key]?.result.ok).length,
    [results],
  );

  function saveUrl(wf: WorkflowMeta) {
    setWorkflowUrl(wf.key, urls[wf.key]);
    toast.success(`${wf.label}: URL salva`);
  }

  function saveToken() {
    setWebhookToken(token);
    toast.success(token ? "Token salvo" : "Token removido");
  }

  async function runValidate(wf: WorkflowMeta) {
    const url = getWorkflowUrl(wf.key);
    if (!url) {
      toast.error(`Cole a URL do webhook e clique em Salvar antes de validar.`);
      return;
    }
    setLoading((l) => ({ ...l, [wf.key]: "validate" }));
    const result = await validateWebhook(url);
    setResults((r) => ({ ...r, [wf.key]: { mode: "validate", result, at: new Date().toISOString() } }));
    setLoading((l) => ({ ...l, [wf.key]: undefined }));
    if (result.ok) toast.success(`${wf.label}: webhook respondeu ${result.status} em ${result.ms}ms`);
    else toast.error(`${wf.label}: ${result.error ?? `status ${result.status}`}`);
  }

  async function runReal(wf: WorkflowMeta) {
    const url = getWorkflowUrl(wf.key);
    if (!url) {
      toast.error(`Cole a URL do webhook e clique em Salvar antes de testar.`);
      return;
    }
    setLoading((l) => ({ ...l, [wf.key]: "real" }));
    const result = await callWebhook(url, wf.samplePayload);
    setResults((r) => ({ ...r, [wf.key]: { mode: "real", result, at: new Date().toISOString() } }));
    setLoading((l) => ({ ...l, [wf.key]: undefined }));
    if (result.ok) toast.success(`${wf.label}: payload aceito (${result.status})`);
    else toast.error(`${wf.label}: ${result.error ?? `status ${result.status}`}`);
  }

  async function downloadJson(wf: WorkflowMeta) {
    try {
      const res = await fetch(wf.jsonPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trim()) throw new Error("arquivo vazio");
      let nodes = 0;
      try { nodes = JSON.parse(text)?.nodes?.length ?? 0; } catch { /* ignore */ }
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${wf.key}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const kb = (text.length / 1024).toFixed(1);
      toast.success(`${wf.label}: ${kb} KB · ${nodes} nós baixados`);
    } catch (e) {
      toast.error(`${wf.label}: falha ao baixar — ${(e as Error).message}`);
    }
  }

  async function validateAll() {
    for (const wf of WORKFLOWS) {
      if (getWorkflowUrl(wf.key)) await runValidate(wf);
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
          Importe os JSONs no seu n8n self-hosted, cole a URL do webhook abaixo, valide e dispare um payload real.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3">
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
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="n8n-token" className="text-xs flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Token X-Webhook-Token (opcional)
              </Label>
              <Input
                id="n8n-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enviado no header X-Webhook-Token em todas as chamadas"
                type="password"
              />
            </div>
            <Button onClick={saveToken} size="sm" variant="outline" className="gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {WORKFLOWS.map((wf) => {
          const entry = results[wf.key];
          const busy = loading[wf.key];
          const activeUrl = getWorkflowUrl(wf.key);
          return (
            <Card key={wf.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{wf.label}</CardTitle>
                    <CardDescription>{wf.description}</CardDescription>
                    <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
                      caminho padrão: {wf.webhookPath}
                    </code>
                  </div>
                  {statusBadge(activeUrl, entry)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`url-${wf.key}`} className="text-xs">URL do webhook (n8n)</Label>
                    <Input
                      id={`url-${wf.key}`}
                      value={urls[wf.key]}
                      onChange={(e) => setUrls((u) => ({ ...u, [wf.key]: e.target.value }))}
                      placeholder={`https://seu-n8n.exemplo.com${wf.webhookPath}`}
                    />
                  </div>
                  <Button onClick={() => saveUrl(wf)} size="sm" variant="outline" className="gap-2">
                    <Save className="h-4 w-4" /> Salvar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => runValidate(wf)}
                    disabled={!!busy}
                  >
                    {busy === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Validar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => runReal(wf)}
                    disabled={!!busy}
                  >
                    {busy === "real" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Testar com payload real
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => downloadJson(wf)}>
                    <Download className="h-4 w-4" /> Baixar JSON
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
          <p>4. Cole a URL no campo do card acima, clique <strong>Salvar</strong> e use <strong>Validar</strong> / <strong>Testar com payload real</strong>.</p>
          <p className="pt-2 text-xs">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Se o n8n estiver em outro domínio, habilite CORS para <code className="rounded bg-muted px-1">{typeof window !== "undefined" ? window.location.origin : "este domínio"}</code> — caso contrário o navegador bloqueia a chamada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

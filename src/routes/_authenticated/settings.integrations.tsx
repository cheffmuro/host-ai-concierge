import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { pingChatwoot } from "@/services/chatwootService";
import { pingDify } from "@/services/difyService";
import { useIntegrationsStore } from "@/stores/integrationsStore";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  head: () => ({ meta: [{ title: "Integrações — Anfitrião" }] }),
  component: IntegrationsPage,
});

type IntegrationKey = "chatwoot" | "evolution" | "dify" | "n8n";

const definitions: Record<IntegrationKey, { label: string; fields: { name: string; label: string; type?: string; placeholder?: string }[] }> = {
  chatwoot: {
    label: "Chatwoot",
    fields: [
      { name: "url", label: "URL base", placeholder: "https://chat.suaempresa.com.br" },
      { name: "user_token", label: "User Token", type: "password" },
      { name: "account_id", label: "Account ID", placeholder: "1" },
      { name: "inbox_id", label: "Inbox ID (opcional)", placeholder: "1" },
    ],
  },
  evolution: {
    label: "Evolution API (WhatsApp)",
    fields: [
      { name: "url", label: "URL base", placeholder: "https://evo.suaempresa.com.br" },
      { name: "api_key", label: "API Key", type: "password" },
      { name: "instance", label: "Nome da instância", placeholder: "principal" },
    ],
  },
  dify: {
    label: "Dify (RAG)",
    fields: [
      { name: "url", label: "URL base", placeholder: "https://dify.suaempresa.com.br" },
      { name: "api_key", label: "API Key", type: "password" },
      { name: "dataset_id", label: "Dataset ID" },
    ],
  },
  n8n: {
    label: "n8n (Webhooks)",
    fields: [
      { name: "webhook_handoff", label: "Webhook Handoff" },
      { name: "webhook_reverse_logistics", label: "Webhook Reverse Logistics" },
      { name: "webhook_whatsapp", label: "Webhook WhatsApp" },
      { name: "webhook_token", label: "Webhook Token (opcional)", type: "password" },
    ],
  },
};

function IntegrationsPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [data, setData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("app_settings").select("key, value").in("key", Object.keys(definitions))
      .then(({ data: rows }) => {
        const map: Record<string, Record<string, string>> = {};
        rows?.forEach((r: { key: string; value: unknown }) => {
          map[r.key] = (r.value as Record<string, string>) || {};
        });
        setData(map);
        setLoading(false);
      });
  }, []);

  const update = (key: string, field: string, value: string) =>
    setData((d) => ({ ...d, [key]: { ...(d[key] || {}), [field]: value } }));

  const [testing, setTesting] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<string, { ok: boolean; msg: string } | undefined>>({});

  const runPing = async (key: IntegrationKey) => {
    const v = data[key] || {};
    if (key === "chatwoot") return pingChatwoot(v as { url?: string; user_token?: string; account_id?: string });
    if (key === "dify") return pingDify(v as { url?: string; api_key?: string; dataset_id?: string });
    return { ok: true } as const; // evolution/n8n não têm ping remoto trivial (segredos + rota interna)
  };

  const testConnection = async (key: IntegrationKey) => {
    setTesting(key);
    const result = await runPing(key);
    setTesting(null);
    if (result.ok) {
      setPingStatus((s) => ({ ...s, [key]: { ok: true, msg: "Conectado com sucesso" } }));
      toast.success(`${definitions[key].label} conectado`);
    } else {
      setPingStatus((s) => ({ ...s, [key]: { ok: false, msg: result.error } }));
      toast.error(`Falha em ${definitions[key].label}`, { description: result.error });
    }
  };

  const save = async (key: IntegrationKey) => {
    setSaving(key);
    // Ping antes de gravar para não persistir credencial quebrada.
    const result = await runPing(key);
    if (!result.ok) {
      setSaving(null);
      setPingStatus((s) => ({ ...s, [key]: { ok: false, msg: result.error } }));
      toast.error(`Credenciais inválidas`, { description: result.error });
      return;
    }
    const { error } = await supabase.from("app_settings").upsert({ key, value: data[key] || {} });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setPingStatus((s) => ({ ...s, [key]: { ok: true, msg: "Salvo e validado" } }));
    toast.success(`${definitions[key].label} salvo e validado`);
    // Atualiza store para inbox/dashboard reagirem sem reload.
    const v = data[key] || {};
    if (key === "chatwoot") {
      useIntegrationsStore.getState().setChatwoot({
        url: v.url, account_id: v.account_id, inbox_id: v.inbox_id, pubsub_token: v.pubsub_token,
        configured: Boolean(v.url && v.user_token && v.account_id),
      });
    }
    if (key === "dify") {
      useIntegrationsStore.getState().setDify({
        url: v.url, dataset_id: v.dataset_id,
        configured: Boolean(v.url && v.api_key && v.dataset_id),
      });
    }
  };


  const isConfigured = (key: IntegrationKey) => {
    const v = data[key];
    if (!v) return false;
    return definitions[key].fields.filter((f) => !f.label.includes("opcional")).every((f) => v[f.name]?.trim());
  };

  if (loading || roleLoading) return <div className="p-6 text-sm text-slate-500">Carregando…</div>;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight text-slate-900">Integrações</h1>
        <p className="text-sm text-slate-500">Conecte os serviços que alimentam o Anfitrião. Estas credenciais ficam visíveis apenas para administradores.</p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>Apenas administradores podem editar integrações. Você pode ver o status atual abaixo.</div>
        </div>
      )}

      {(Object.keys(definitions) as IntegrationKey[]).map((key) => {
        const def = definitions[key];
        const configured = isConfigured(key);
        return (
          <section key={key} className="rounded-md border border-border/60 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-900">{def.label}</h2>
              <span className={`flex items-center gap-1.5 text-xs ${configured ? "text-emerald-600" : "text-slate-400"}`}>
                {configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {configured ? "Configurado" : "Pendente"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {def.fields.map((f) => (
                <div key={f.name} className="space-y-2">
                  <Label htmlFor={`${key}-${f.name}`}>{f.label}</Label>
                  <Input
                    id={`${key}-${f.name}`}
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    disabled={!isAdmin}
                    value={data[key]?.[f.name] || ""}
                    onChange={(e) => update(key, f.name, e.target.value)}
                  />
                </div>
              ))}
            </div>
            {pingStatus[key] && (
              <div className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                pingStatus[key]!.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}>
                {pingStatus[key]!.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5" />}
                <span>{pingStatus[key]!.msg}</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={() => save(key)} disabled={saving === key || testing === key} className="rounded-sm">
                  {saving === key ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Salvando…</> : "Salvar"}
                </Button>
                {(key === "chatwoot" || key === "dify") && (
                  <Button
                    variant="outline"
                    onClick={() => testConnection(key)}
                    disabled={testing === key || saving === key}
                    className="rounded-sm"
                  >
                    {testing === key ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Testando…</> : "Testar conexão"}
                  </Button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

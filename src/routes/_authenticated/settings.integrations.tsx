import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";

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

  const save = async (key: IntegrationKey) => {
    setSaving(key);
    const { error } = await supabase.from("app_settings").upsert({ key, value: data[key] || {} });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${definitions[key].label} salvo`);
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
            {isAdmin && (
              <Button onClick={() => save(key)} disabled={saving === key} className="rounded-sm">
                {saving === key ? "Salvando…" : "Salvar"}
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}

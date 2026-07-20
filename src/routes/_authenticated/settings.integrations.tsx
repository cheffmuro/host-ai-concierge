import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Link2Off } from "lucide-react";
import { pingChatwoot } from "@/services/chatwootService";
import { pingDify } from "@/services/difyService";
import { useIntegrationsStore } from "@/stores/integrationsStore";
import { ensureActiveSession, isJwtExpiredError, refreshSessionForRetry } from "@/lib/client-session";
import {
  getMetaAppConfig,
  getMetaConnectionStatus,
  saveMetaAppConfig,
  startMetaOAuth,
  disconnectMeta,
  type MetaChannel,
  type MetaAppConfig,
  type MetaConnectionStatus,
} from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  head: () => ({ meta: [{ title: "Integrações — Anfitrião" }] }),
  component: IntegrationsPage,
});

type IntegrationKey = "chatwoot" | "evolution" | "dify";

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
};

const integrationKeys = Object.keys(definitions) as IntegrationKey[];

function IntegrationsPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [data, setData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    await ensureActiveSession();

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data: memberRow } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    const currentOrg = (memberRow as { org_id: string } | null)?.org_id ?? null;
    setOrgId(currentOrg);

    const fetchSettings = () => supabase.from("app_settings").select("key, value").in("key", integrationKeys);
    let { data: rows, error } = await fetchSettings();
    if (isJwtExpiredError(error)) {
      await refreshSessionForRetry();
      ({ data: rows, error } = await fetchSettings());
    }
    if (error) {
      console.error("[integrations] settings load failed:", error.message);
      toast.error("Não foi possível carregar integrações", { description: error.message });
      setLoading(false);
      return;
    }
    const map: Record<string, Record<string, string>> = {};
    rows?.forEach((r: { key: string; value: unknown }) => {
      map[r.key] = (r.value as Record<string, string>) || {};
    });
    setData(map);
    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: string, field: string, value: string) =>
    setData((d) => ({ ...d, [key]: { ...(d[key] || {}), [field]: value } }));

  const [testing, setTesting] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<string, { ok: boolean; msg: string } | undefined>>({});

  const runPing = async (key: IntegrationKey) => {
    try {
      const v = data[key] || {};
      if (key === "chatwoot") return pingChatwoot(v as { url?: string; user_token?: string; account_id?: string });
      if (key === "dify") return pingDify(v as { url?: string; api_key?: string; dataset_id?: string });
      return { ok: true } as const; // evolution não tem ping remoto trivial (segredos + rota interna)
    } catch (error) {
      console.error(`[integrations] ping ${key} failed:`, error);
      return { ok: false as const, error: "Não foi possível testar a conexão agora." };
    }
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
    await ensureActiveSession();
    if (!orgId) { setSaving(null); toast.error("Organização não encontrada"); return; }
    const persist = () => supabase.from("app_settings").upsert({ key, value: data[key] || {}, org_id: orgId });
    let { error } = await persist();
    if (isJwtExpiredError(error)) {
      await refreshSessionForRetry();
      ({ error } = await persist());
    }
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setPingStatus((s) => ({ ...s, [key]: { ok: true, msg: "Salvo" } }));
    toast.success(`${definitions[key].label} salvo`);
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
    if (key === "chatwoot" || key === "dify") {
      const result = await runPing(key);
      if (result.ok) {
        setPingStatus((s) => ({ ...s, [key]: { ok: true, msg: "Salvo e validado" } }));
      } else {
        setPingStatus((s) => ({ ...s, [key]: { ok: false, msg: `Salvo, mas o teste falhou: ${result.error}` } }));
        toast.warning("Configuração salva, mas o teste falhou", { description: result.error });
      }
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

      {integrationKeys.map((key) => {
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
                    value={data[key]?.[f.name] || ""}
                    onChange={(e) => update(key, f.name, e.target.value)}
                    disabled={!isAdmin}
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
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={() => save(key)} disabled={saving === key || testing === key} className="rounded-sm">
                  {saving === key ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Salvando…</> : "Salvar"}
                </Button>
              )}
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
          </section>
        );
      })}

      <MetaCard isAdmin={isAdmin} />
    </div>
  );
}

// ---------- Meta (Instagram / Messenger / WhatsApp Cloud) --------------------

const META_CALLBACK_HINT =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/public/meta/callback`
    : "https://host-concierge.lovable.app/api/public/meta/callback";

function MetaCard({ isAdmin }: { isAdmin: boolean }) {
  const fetchApp = useServerFn(getMetaAppConfig);
  const fetchStatus = useServerFn(getMetaConnectionStatus);
  const saveApp = useServerFn(saveMetaAppConfig);
  const startOAuth = useServerFn(startMetaOAuth);
  const disconnect = useServerFn(disconnectMeta);

  const [app, setApp] = useState<{ app_id: string; app_secret: string; redirect_uri: string }>({
    app_id: "",
    app_secret: "",
    redirect_uri: META_CALLBACK_HINT,
  });
  const [appCfg, setAppCfg] = useState<MetaAppConfig | null>(null);
  const [status, setStatus] = useState<MetaConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [channels, setChannels] = useState<Record<MetaChannel, boolean>>({
    instagram: true,
    messenger: true,
    whatsapp: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([fetchApp(), fetchStatus()]);
      setAppCfg(a);
      setStatus(s);
      if (a?.app_id || a?.redirect_uri) {
        setApp((prev) => ({
          app_id: a.app_id ?? prev.app_id,
          app_secret: "",
          redirect_uri: a.redirect_uri ?? prev.redirect_uri,
        }));
      }
    } catch (e) {
      console.error("[meta] load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Handle ?meta=connected|error from callback redirect.
    const params = new URLSearchParams(window.location.search);
    const meta = params.get("meta");
    if (meta === "connected") {
      toast.success("Meta conectada com sucesso");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (meta === "error") {
      toast.error("Falha ao conectar com Meta", { description: params.get("meta_detail") ?? undefined });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveApp = async () => {
    if (!app.app_id || !app.app_secret || !app.redirect_uri) {
      toast.error("Preencha App ID, App Secret e Redirect URI");
      return;
    }
    setSaving(true);
    try {
      await saveApp({ data: app });
      toast.success("Credenciais Meta salvas");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onConnect = async () => {
    const selected = (Object.keys(channels) as MetaChannel[]).filter((c) => channels[c]);
    if (selected.length === 0) {
      toast.error("Selecione ao menos um canal");
      return;
    }
    setConnecting(true);
    try {
      const { authorization_url } = await startOAuth({ data: { channels: selected } });
      window.location.href = authorization_url;
    } catch (e) {
      setConnecting(false);
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar OAuth");
    }
  };

  const onDisconnect = async () => {
    if (!confirm("Desconectar a conta Meta desta organização?")) return;
    try {
      await disconnect();
      toast.success("Meta desconectada");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desconectar");
    }
  };

  if (loading) {
    return (
      <section className="rounded-md border border-border/60 bg-white p-6 text-sm text-slate-500">
        Carregando Meta…
      </section>
    );
  }

  const configured = appCfg?.configured ?? false;
  const connected = status?.connected ?? false;

  return (
    <section className="rounded-md border border-border/60 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Meta — Instagram, Messenger e WhatsApp Cloud</h2>
          <p className="text-xs text-slate-500">
            OAuth direto com a Meta.{" "}
            <a
              href="/settings/guide#meta"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              Como criar o app <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            connected ? "text-emerald-600" : configured ? "text-amber-600" : "text-slate-400"
          }`}
        >
          {connected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
            </>
          ) : configured ? (
            <>
              <AlertCircle className="h-3.5 w-3.5" /> Pronto para conectar
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" /> Pendente
            </>
          )}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="meta-app-id">App ID</Label>
          <Input
            id="meta-app-id"
            value={app.app_id}
            onChange={(e) => setApp((a) => ({ ...a, app_id: e.target.value }))}
            placeholder="1234567890"
            disabled={!isAdmin}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-app-secret">App Secret</Label>
          <Input
            id="meta-app-secret"
            type="password"
            value={app.app_secret}
            onChange={(e) => setApp((a) => ({ ...a, app_secret: e.target.value }))}
            placeholder={appCfg?.configured ? "•••••••• (salvo — reenviar só se trocar)" : ""}
            disabled={!isAdmin}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="meta-redirect">Redirect URI</Label>
          <Input
            id="meta-redirect"
            value={app.redirect_uri}
            onChange={(e) => setApp((a) => ({ ...a, redirect_uri: e.target.value }))}
            disabled={!isAdmin}
          />
          <p className="text-[11px] text-slate-500">
            Cole exatamente essa URL em <em>Facebook Login for Business → Valid OAuth Redirect URIs</em>.
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSaveApp} disabled={saving} className="rounded-sm">
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar credenciais"
            )}
          </Button>
        </div>
      )}

      <div className="border-t border-slate-100 pt-5 space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Canais para autorizar
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          {(["instagram", "messenger", "whatsapp"] as MetaChannel[]).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels[c]}
                onChange={(e) => setChannels((s) => ({ ...s, [c]: e.target.checked }))}
                disabled={!isAdmin || !configured}
              />
              {c === "instagram" ? "Instagram Direct" : c === "messenger" ? "Facebook Messenger" : "WhatsApp Cloud"}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button
              onClick={onConnect}
              disabled={!configured || connecting}
              className="rounded-sm"
              title={configured ? "" : "Salve as credenciais primeiro"}
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Redirecionando…
                </>
              ) : connected ? (
                "Reautorizar com Meta"
              ) : (
                "Conectar com Meta"
              )}
            </Button>
          )}
          {isAdmin && connected && (
            <Button variant="outline" onClick={onDisconnect} className="rounded-sm">
              <Link2Off className="mr-1.5 h-3 w-3" />
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {connected && status && (
        <div className="border-t border-slate-100 pt-5 space-y-3 text-sm">
          <div className="text-xs text-slate-500">
            Conectado como <strong className="text-slate-800">{status.user_name ?? "conta Meta"}</strong>
            {status.connected_at && (
              <> · em {new Date(status.connected_at).toLocaleString()}</>
            )}
          </div>

          {status.pages.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Páginas do Facebook / contas Instagram
              </div>
              <ul className="space-y-1.5">
                {status.pages.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-slate-500">
                        Page ID {p.id}
                        {p.instagram && <> · IG @{p.instagram.username ?? p.instagram.id}</>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.wa_numbers.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Números WhatsApp Cloud
              </div>
              <ul className="space-y-1.5">
                {status.wa_numbers.map((n) => (
                  <li
                    key={n.id}
                    className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="font-medium text-slate-800">
                      {n.display_phone_number ?? n.id}
                    </div>
                    <div className="text-slate-500">
                      {n.verified_name && <>{n.verified_name} · </>}
                      WABA {n.waba_id ?? "-"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.pages.length === 0 && status.wa_numbers.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              OAuth aprovado mas nenhuma Página / conta Instagram / número WhatsApp foi
              autorizada. Reautorize e selecione as contas na tela de consentimento da Meta.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyBranding, updateMyBranding, type OrgBranding } from "@/lib/branding.functions";
import { useIsAdmin } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/branding")({
  head: () => ({ meta: [{ title: "Marca — Anfitrião" }] }),
  component: BrandingPage,
});

function BrandingPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const fetchBranding = useServerFn(getMyBranding);
  const saveBranding = useServerFn(updateMyBranding);
  const [b, setB] = useState<Partial<OrgBranding>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchBranding();
      if (!cancelled && r) setB(r);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchBranding]);

  const update = (field: keyof OrgBranding, v: string) => setB((s) => ({ ...s, [field]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveBranding({
        data: {
          brand_name: b.brand_name ?? null,
          logo_url: (b.logo_url as string) || null,
          primary_color: b.primary_color ?? null,
          accent_color: b.accent_color ?? null,
          custom_domain: b.custom_domain ?? null,
          support_email: (b.support_email as string) || null,
        },
      });
      toast.success("Marca atualizada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error("Falha ao salvar", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Marca (White-label)</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize logo, cores e domínio da sua operação.</p>
      </div>

      {!isAdmin && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Apenas administradores podem editar a marca.
        </div>
      )}

      <div className="grid gap-4">
        <Field label="Nome da marca">
          <Input disabled={!isAdmin} value={b.brand_name ?? ""} onChange={(e) => update("brand_name", e.target.value)} placeholder="Minha Empresa" />
        </Field>
        <Field label="URL do logo (PNG/SVG)">
          <Input disabled={!isAdmin} value={b.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://.../logo.svg" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cor primária">
            <div className="flex gap-2">
              <Input disabled={!isAdmin} type="color" className="h-10 w-16 p-1" value={b.primary_color ?? "#0f172a"} onChange={(e) => update("primary_color", e.target.value)} />
              <Input disabled={!isAdmin} value={b.primary_color ?? ""} onChange={(e) => update("primary_color", e.target.value)} placeholder="#0f172a" />
            </div>
          </Field>
          <Field label="Cor de destaque">
            <div className="flex gap-2">
              <Input disabled={!isAdmin} type="color" className="h-10 w-16 p-1" value={b.accent_color ?? "#3b82f6"} onChange={(e) => update("accent_color", e.target.value)} />
              <Input disabled={!isAdmin} value={b.accent_color ?? ""} onChange={(e) => update("accent_color", e.target.value)} placeholder="#3b82f6" />
            </div>
          </Field>
        </div>
        <Field label="Domínio customizado (opcional)">
          <Input disabled={!isAdmin} value={b.custom_domain ?? ""} onChange={(e) => update("custom_domain", e.target.value)} placeholder="app.suamarca.com.br" />
        </Field>
        <Field label="E-mail de suporte">
          <Input disabled={!isAdmin} type="email" value={b.support_email ?? ""} onChange={(e) => update("support_email", e.target.value)} placeholder="suporte@suamarca.com.br" />
        </Field>
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : "Salvar marca"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Pré-visualização</p>
        <div className="flex items-center gap-3">
          {b.logo_url ? (
            <img src={b.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-sm flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: b.primary_color ?? "#0f172a" }}>
              {(b.brand_name ?? "A").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-slate-900">{b.brand_name || "Minha Empresa"}</div>
            <div className="text-xs" style={{ color: b.accent_color ?? "#3b82f6" }}>{b.custom_domain || "app.suamarca.com.br"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

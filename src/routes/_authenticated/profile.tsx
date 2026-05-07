import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil — Anfitrião" }] }),
  component: ProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().min(2).max(80),
  company: z.string().trim().max(120).optional(),
});

function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, company").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setCompany(data?.company ?? "");
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ display_name: displayName, company });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: parsed.data.display_name,
      company: parsed.data.company || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) { toast.error(error.message); return; }
    setNewPassword("");
    toast.success("Senha alterada");
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-8">
      <div>
        <h1 className="text-xl font-medium tracking-tight text-slate-900">Perfil</h1>
        <p className="text-sm text-slate-500">Gerencie suas informações de conta.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-md border border-border/60 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-900">Informações</h2>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Nome</Label>
          <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
        </div>
        <Button type="submit" disabled={loading} className="rounded-sm">{loading ? "Salvando…" : "Salvar"}</Button>
      </form>

      <form onSubmit={handleChangePassword} className="space-y-4 rounded-md border border-border/60 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-900">Alterar senha</h2>
        <div className="space-y-2">
          <Label htmlFor="new_password">Nova senha</Label>
          <Input id="new_password" type="password" minLength={8} maxLength={72} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={savingPwd} variant="outline" className="rounded-sm">
          {savingPwd ? "Atualizando…" : "Atualizar senha"}
        </Button>
      </form>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — Anfitrião" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token=")) setMode("update");
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email enviado. Verifique sua caixa de entrada.");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="m-auto w-full max-w-md p-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-900 text-sm font-medium text-white">A</div>
          <span className="text-sm font-medium">Anfitrião</span>
        </Link>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          {mode === "request" ? "Recuperar senha" : "Definir nova senha"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "request" ? "Enviaremos um link para seu email." : "Crie uma senha segura com no mínimo 8 caracteres."}
        </p>

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-sm">
              {loading ? "Enviando…" : "Enviar link"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-sm">
              {loading ? "Atualizando…" : "Atualizar senha"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-medium text-slate-900 hover:underline">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}

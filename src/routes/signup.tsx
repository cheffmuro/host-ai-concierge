import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z.string().trim().email("Email inválido").max(255),
  company: z.string().trim().max(120).optional(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — Anfitrião" }, { name: "description", content: "Crie sua conta no Concierge OS." }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({ name, email, company, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: parsed.data.name, company: parsed.data.company },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) {
      toast.success("Conta criada!");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Verifique seu email para confirmar a conta.");
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) { toast.error(result.error.message || "Falha no login Google"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="m-auto w-full max-w-md p-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-900 text-sm font-medium text-white">A</div>
          <span className="text-sm font-medium">Anfitrião</span>
        </Link>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Criar sua conta</h1>
        <p className="mt-1 text-sm text-slate-500">Comece grátis. Sem cartão de crédito.</p>

        <Button onClick={handleGoogle} variant="outline" className="mt-8 w-full rounded-sm gap-2">
          Continuar com Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-border/60" /> ou <div className="h-px flex-1 bg-border/60" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Empresa <span className="text-slate-400">(opcional)</span></Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} />
            <p className="text-xs text-slate-500">Mínimo 8 caracteres</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-sm">
            {loading ? "Criando…" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck, User as UserIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { listCompanyUsers, setUserRole, type CompanyUser, type AppRole } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/settings/users")({
  head: () => ({ meta: [{ title: "Usuários — Anfitrião" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { user } = useAuth();
  const listFn = useServerFn(listCompanyUsers);
  const setRoleFn = useServerFn(setUserRole);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listFn();
      if (res.error) setError(res.error);
      else setError(null);
      setUsers(res.users);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, isAdmin]);

  if (roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-md border border-border/60 bg-white p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" strokeWidth={1.5} />
          <h1 className="text-lg font-medium text-slate-900">Acesso restrito</h1>
          <p className="mt-1 text-sm text-slate-600">
            Somente administradores podem gerenciar usuários da empresa.
          </p>
        </div>
      </div>
    );
  }

  const handleChange = async (u: CompanyUser, role: AppRole) => {
    if (u.role === role) return;
    setUpdating(u.id);
    const res = await setRoleFn({ data: { userId: u.id, role } });
    setUpdating(null);
    if (!res.ok) {
      toast.error(res.error ?? "Falha ao atualizar");
      return;
    }
    toast.success(`${u.email ?? "Usuário"} agora é ${role === "admin" ? "administrador" : "usuário padrão"}`);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, role } : p)));
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/settings/integrations"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3 w-3" /> Configurações
          </Link>
          <h1 className="mt-1 text-xl font-medium tracking-tight text-slate-900">
            Usuários da empresa
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie quem tem acesso administrativo à plataforma.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border/60 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Último acesso</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === user?.id;
                const initials = (u.display_name || u.email || "?").slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {u.display_name || u.email?.split("@")[0] || "—"}
                            {isSelf && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          u.role === "admin"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role === "admin" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <UserIcon className="h-3 w-3" />
                        )}
                        {u.role === "admin" ? "Administrador" : "Padrão"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={u.role === "admin" ? "secondary" : "outline"}
                          size="sm"
                          disabled={updating === u.id || u.role === "admin"}
                          onClick={() => handleChange(u, "admin")}
                        >
                          {updating === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Tornar admin"
                          )}
                        </Button>
                        <Button
                          variant={u.role === "member" ? "secondary" : "outline"}
                          size="sm"
                          disabled={updating === u.id || u.role === "member"}
                          onClick={() => handleChange(u, "member")}
                        >
                          Tornar padrão
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Administradores podem editar integrações, gerenciar usuários e ver todos os dados.
        Usuários padrão têm acesso operacional (Inbox, Dashboard) sem alterar configurações.
      </p>
    </div>
  );
}

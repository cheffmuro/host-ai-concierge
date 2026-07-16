## Diagnóstico

Ambos os sintomas — sidebar sem "Usuários" e banner "Apenas administradores podem editar integrações" — vêm da mesma raiz: o hook `useIsAdmin` está retornando `false` para o Guillermo, embora no banco ele já esteja como `admin`.

O hook atual (`src/hooks/useRole.ts`) faz duas coisas antes de consultar o papel:

1. Chama `getFreshSession()` que tenta `getSession()` + `refreshSession()`. Se o refresh do JWT falhar (mesma classe de erro "JWT expired" que já derrubou o dashboard antes), a função retorna `null`, força `signOut({ scope: "local" })` e o hook aborta com `isAdmin=false`.
2. Só depois faz o `select` em `user_roles`.

Como o `AuthProvider` mantém a sessão viva por outro caminho (`onAuthStateChange`), o usuário continua "logado" na UI (email aparece na sidebar), mas o `useIsAdmin` acaba silenciosamente cego — daí sumir o item "Usuários" e travar os inputs de Integrações.

## Correção

Simplificar `useIsAdmin` para depender apenas da sessão viva do `useAuth()` e re-executar quando ela mudar, sem chamar `getFreshSession` (que pode disparar signout local).

### Novo comportamento de `src/hooks/useRole.ts`

- Ler `user` e `session` de `useAuth()`.
- Enquanto `useAuth().loading` for `true`, manter `loading=true`.
- Se não houver `user`, `isAdmin=false`, `loading=false`.
- Se houver `user`, chamar `supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role","admin").maybeSingle()` diretamente — o cliente do browser já anexa o bearer atual; RLS `user_roles_select_self` permite o SELECT.
- Re-executar quando `user?.id` mudar (troca de conta) e também quando ocorrer `TOKEN_REFRESHED`/`SIGNED_IN` via `supabase.auth.onAuthStateChange`, para recuperar após uma renovação de token.
- Tratar erro do select como `isAdmin=false` mas manter `loading=false` sem forçar logout.

### Verificação após o fix

- Recarregar `/settings/integrations` como Guillermo: banner amarelo desaparece, campos ficam habilitados, botão "Salvar" funciona.
- Sidebar passa a mostrar "Usuários" entre "Manual" e "Perfil".
- Rota `/settings/users` lista os 2 usuários existentes e o botão "Tornar admin/padrão" funciona (server function já está pronta e valida admin do lado servidor).

## Fora do escopo

- Não mexer em `getFreshSession` nem no `AuthProvider` — o problema recorrente de JWT já é mitigado nas server functions e não precisa mudar aqui.
- Não alterar policies do `user_roles` — a policy atual já cobre o caso.

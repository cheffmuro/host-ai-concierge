## Objetivo
Trocar o link `<a download>` da página `/workflows` por um botão que faz `fetch` + `Blob` + download programático, garantindo que o JSON seja baixado como arquivo (e não exibido como página em branco pelo navegador).

## Mudanças

**`src/routes/workflows.tsx`**
- Adicionar função `downloadJson(wf)` que:
  - faz `fetch(wf.jsonPath)`
  - valida `res.ok` e tamanho > 0
  - converte em `Blob({ type: "application/json" })`
  - cria `URL.createObjectURL`, dispara `<a>` temporário com `download={wf.key}.json`, revoga a URL
  - mostra `toast.success` com o tamanho em KB e número de nós (parse do JSON)
  - em caso de erro mostra `toast.error`
- Substituir o `<Button asChild><a href={wf.jsonPath} download>` pelo botão que chama `downloadJson(wf)`.
- Manter ícone `Download` e label "Baixar JSON".

## Fora do escopo
- Não mexer em `n8nService.ts`, sidebar ou nos JSONs em `public/n8n/` (já validados como íntegros).

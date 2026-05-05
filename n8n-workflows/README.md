# n8n Workflows — Anfitrião

3 workflows prontos para importar no n8n self-hosted (stack `docker-compose.yml`).

| Arquivo | Webhook path | Função |
|---|---|---|
| `whatsapp-rag-chatwoot.json` | `/webhook/whatsapp` | Recebe mensagem da Evolution → cria/atualiza conversa no Chatwoot → consulta Dify (RAG) → responde no WhatsApp e loga no Chatwoot |
| `handoff.json` | `/webhook/handoff` | Desliga `ai_handling` da conversa no Chatwoot e grava nota privada |
| `reverse-logistics.json` | `/webhook/reverse-logistics` | Gera `trackingId` (placeholder para integração com ERP/Shopify) |

## Importar

n8n → **Workflows → Import from File** → selecione cada `.json` → **Save → Active**.

## Variáveis de ambiente (n8n)

Adicione em **Settings → Variables** (ou no `docker-compose.yml` do n8n via `environment:`):

```
CHATWOOT_URL=https://chat.suaempresa.com.br
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_API_TOKEN=<gerado em Chatwoot · Profile · Access Token>
CHATWOOT_INBOX_IDENTIFIER=<identifier do inbox API criado no Chatwoot>

EVOLUTION_URL=https://evo.suaempresa.com.br
EVOLUTION_API_KEY=<EVOLUTION_API_KEY do .env do compose>

DIFY_URL=https://dify.suaempresa.com.br
DIFY_API_KEY=<App · API Access · Service API key>
```

> O `CHATWOOT_INBOX_IDENTIFIER` é diferente do `INBOX_ID`: é o identificador
> público do canal API (visível em Inbox Settings → Configuration → API Channel).

## Configurar Evolution para chamar o webhook

```bash
curl -X POST https://evo.suaempresa.com.br/webhook/set/<INSTANCIA> \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://n8n.suaempresa.com.br/webhook/whatsapp",
    "events": ["MESSAGES_UPSERT"],
    "webhook_by_events": false
  }'
```

## Testar de ponta a ponta

1. Envie uma mensagem do seu celular para o número conectado na Evolution.
2. Acompanhe a execução em **n8n · Executions** (deve marcar verde em todos os nós).
3. Confira a conversa criada em **Chatwoot · Conversations** com:
   - 1ª mensagem incoming (cliente)
   - 2ª mensagem outgoing com badge de IA
4. O cliente deve receber a resposta automática no WhatsApp.

## Acionar handover a partir do painel Anfitrião

O front-end chama `VITE_N8N_WEBHOOK_HANDOFF` ao clicar em "Assumir conversa".
O workflow `handoff.json` desativa o flag `ai_handling` no Chatwoot, fazendo o
workflow principal ignorar a próxima mensagem (você pode adicionar um `IF` no
fluxo principal lendo `custom_attributes.ai_handling` antes do nó Dify).

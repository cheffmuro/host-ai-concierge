#!/usr/bin/env bash
# Cria a instância Evolution + registra webhook do n8n.
# Uso: bash evolution/create-instance.sh [NOME_INSTANCIA]
set -euo pipefail

INSTANCE="${1:-host-ai-concierge}"
EVO_URL="https://evo.${BASE_DOMAIN:?defina BASE_DOMAIN}"
N8N_WEBHOOK="https://n8n.${BASE_DOMAIN}/webhook/whatsapp-rag"
KEY="${EVOLUTION_API_KEY:?defina EVOLUTION_API_KEY no .env e exporte antes de rodar}"

echo "→ Criando instância '$INSTANCE' em $EVO_URL"
curl -fsSL -X POST "$EVO_URL/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: $KEY" \
  -d "{\"instanceName\":\"$INSTANCE\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}" \
  | jq .

echo "→ Registrando webhook → $N8N_WEBHOOK"
curl -fsSL -X POST "$EVO_URL/webhook/set/$INSTANCE" \
  -H "Content-Type: application/json" \
  -H "apikey: $KEY" \
  -d "{\"webhook\":{\"url\":\"$N8N_WEBHOOK\",\"enabled\":true,\"events\":[\"MESSAGES_UPSERT\"]}}" \
  | jq .

echo "→ QR code:"
curl -fsSL "$EVO_URL/instance/connect/$INSTANCE" -H "apikey: $KEY" | jq -r '.base64 // .qrcode // .'
echo
echo "Escaneie no WhatsApp → Aparelhos conectados."

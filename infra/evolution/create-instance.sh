#!/usr/bin/env bash
# Cria a instância Evolution.
# Uso: bash evolution/create-instance.sh [NOME_INSTANCIA]
set -euo pipefail

INSTANCE="${1:-host-ai-concierge}"
EVO_URL="https://evo.${BASE_DOMAIN:?defina BASE_DOMAIN}"
KEY="${EVOLUTION_API_KEY:?defina EVOLUTION_API_KEY no .env e exporte antes de rodar}"

echo "→ Criando instância '$INSTANCE' em $EVO_URL"
curl -fsSL -X POST "$EVO_URL/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: $KEY" \
  -d "{\"instanceName\":\"$INSTANCE\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}" \
  | jq .

echo "→ QR code:"
curl -fsSL "$EVO_URL/instance/connect/$INSTANCE" -H "apikey: $KEY" | jq -r '.base64 // .qrcode // .'
echo
echo "Escaneie no WhatsApp → Aparelhos conectados."
echo "Conecte a instância ao Chatwoot pelo painel do Chatwoot (Inbox → API channel + integração Evolution)."

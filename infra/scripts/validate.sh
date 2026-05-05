#!/usr/bin/env bash
# 6 checks de saúde da stack. Exit != 0 em qualquer falha.
set -uo pipefail

cd "$(dirname "$0")/.."
. ./.env

FRONT_ORIGIN="${FRONT_ORIGIN:-https://anfitriao.vercel.app}"
N8N_HANDOFF_URL="${N8N_HANDOFF_URL:-https://n8n.${BASE_DOMAIN}/webhook/handoff}"

pass=0; fail=0
check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "✅ $name"; pass=$((pass+1))
  else
    echo "❌ $name"; fail=$((fail+1))
  fi
}

code() { curl -ksS -o /dev/null -w "%{http_code}" "$@"; }

# 1. Chatwoot
[ "$(code https://chatwoot.${BASE_DOMAIN}/api)" = "200" ] \
  && echo "✅ Chatwoot up" && pass=$((pass+1)) \
  || { echo "❌ Chatwoot up"; fail=$((fail+1)); }

# 2. Dify (401 = up + auth exigida)
c=$(code https://dify.${BASE_DOMAIN}/console/api/setup); \
  [[ "$c" =~ ^(200|401|403)$ ]] \
  && echo "✅ Dify up ($c)" && pass=$((pass+1)) \
  || { echo "❌ Dify up ($c)"; fail=$((fail+1)); }

# 3. n8n
[ "$(code https://n8n.${BASE_DOMAIN}/healthz)" = "200" ] \
  && echo "✅ n8n up" && pass=$((pass+1)) \
  || { echo "❌ n8n up"; fail=$((fail+1)); }

# 4. Evolution
c=$(code -H "apikey: ${EVOLUTION_API_KEY}" https://evo.${BASE_DOMAIN}/instance/fetchInstances); \
  [ "$c" = "200" ] \
  && echo "✅ Evolution up" && pass=$((pass+1)) \
  || { echo "❌ Evolution up ($c)"; fail=$((fail+1)); }

# 5. Webhook n8n handoff
c=$(curl -ksS -o /dev/null -w "%{http_code}" -X POST "$N8N_HANDOFF_URL" \
  -H "Content-Type: application/json" -d '{"conversationId":"test","source":"validate"}'); \
  [[ "$c" =~ ^(200|201|204)$ ]] \
  && echo "✅ Webhook n8n handoff" && pass=$((pass+1)) \
  || { echo "❌ Webhook n8n handoff ($c)"; fail=$((fail+1)); }

# 6. CORS Chatwoot
hdr=$(curl -ksS -X OPTIONS "https://chatwoot.${BASE_DOMAIN}/api/v1/accounts/1/conversations" \
  -H "Origin: $FRONT_ORIGIN" \
  -H "Access-Control-Request-Method: GET" -D - -o /dev/null \
  | tr -d '\r' | grep -i '^access-control-allow-origin:' || true)
[ -n "$hdr" ] \
  && echo "✅ CORS Chatwoot ($hdr)" && pass=$((pass+1)) \
  || { echo "❌ CORS Chatwoot (sem header)"; fail=$((fail+1)); }

echo
echo "Resultado: $pass passou / $fail falhou"
exit $fail

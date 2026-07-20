#!/usr/bin/env bash
# Bootstrap completo da VPS: instala docker, valida .env e sobe a stack.
set -euo pipefail

cd "$(dirname "$0")/.."

# --- 1. Docker ---
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Instalando Docker"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "→ Instalando docker compose plugin"
  apt-get update && apt-get install -y docker-compose-plugin
fi

# --- 2. .env ---
if [ ! -f .env ]; then
  echo "ERRO: .env não encontrado. Rode: cp .env.example .env && nano .env"
  exit 1
fi

required=(BASE_DOMAIN POSTGRES_PASSWORD REDIS_PASSWORD CHATWOOT_SECRET_KEY_BASE DIFY_SECRET_KEY EVOLUTION_API_KEY)
for v in "${required[@]}"; do
  if ! grep -qE "^$v=.+" .env; then
    echo "ERRO: variável obrigatória '$v' vazia no .env"
    exit 1
  fi
done

chmod +x scripts/*.sh evolution/*.sh

# --- 3. Up ---
echo "→ Subindo stack (docker compose up -d)"
docker compose up -d

# --- 4. Chatwoot DB prepare ---
echo "→ Aguardando Chatwoot..."
for i in $(seq 1 60); do
  if docker compose exec -T chatwoot-rails bundle exec rails runner "puts 'ok'" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done
echo "→ Chatwoot db:chatwoot_prepare"
docker compose exec -T chatwoot-rails bundle exec rails db:chatwoot_prepare || true

echo
echo "✅ Stack no ar. Acesse:"
. ./.env
echo "   Chatwoot: https://chatwoot.${BASE_DOMAIN}"
echo "   Dify:     https://dify.${BASE_DOMAIN}"
echo "   Evo:      https://evo.${BASE_DOMAIN}"
echo "   Evo:      https://evo.${BASE_DOMAIN}"

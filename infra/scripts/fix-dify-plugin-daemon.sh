#!/usr/bin/env bash
# Adiciona o dify-plugin-daemon (necessário no Dify 1.0+).
# Idempotente: pode rodar quantas vezes quiser.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull (descartando edições locais conflitantes)"
git checkout -- docker-compose.yml 2>/dev/null || true
git pull --rebase || git pull || true

echo "==> Criando database 'dify_plugin' no Postgres (se ainda não existe)"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-host-ai-concierge}" -d postgres -c \
  "SELECT 'CREATE DATABASE dify_plugin' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dify_plugin')\gexec" \
  || echo "    (DB já existe ou criação falhou — checar manualmente se o erro persistir)"

echo "==> Subindo dify-plugin-daemon e recriando dify-api/web"
docker compose up -d dify-plugin-daemon
docker compose up -d --force-recreate dify-api dify-web

echo "==> Aguardando plugin-daemon (até 60s)"
for i in $(seq 1 30); do
  if docker compose exec -T dify-plugin-daemon wget -qO- http://localhost:5002/health >/dev/null 2>&1 \
     || docker compose exec -T dify-plugin-daemon sh -c "ss -tln | grep -q ':5002'" 2>/dev/null; then
    echo "    plugin-daemon ouvindo em :5002"
    break
  fi
  sleep 2
done

echo "==> Status final"
docker compose ps dify-plugin-daemon dify-api dify-web

echo "==> Logs recentes do plugin-daemon"
docker compose logs --tail=20 dify-plugin-daemon

echo
echo "✅ Pronto. Recarrega https://dify.anfitriao.app.br (Ctrl+Shift+R)."

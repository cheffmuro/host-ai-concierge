#!/usr/bin/env bash
# Idempotente: força user:0:0 no dify-api/worker, conserta volume e roda setup.
# Uso: bash infra/scripts/fix-dify-permissions.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Resetando docker-compose.yml local e puxando última versão do git"
git checkout -- docker-compose.yml 2>/dev/null || true
git pull --rebase || true

echo "==> Recriando containers dify-api e dify-worker com user:0:0"
docker compose up -d --force-recreate dify-api dify-worker

echo "==> Aguardando API ficar pronta (até 90s)"
for i in $(seq 1 45); do
  code=$(curl -ksS -o /dev/null -w "%{http_code}" https://dify.anfitriao.app.br/console/api/setup || echo 000)
  if [ "$code" = "200" ]; then
    echo "    API up (HTTP 200) após ${i} tentativas."
    break
  fi
  sleep 2
done

echo "==> Confirmando que o processo roda como root"
docker compose exec -T dify-api id || true

echo "==> Tentando criar admin via /console/api/setup"
curl -ksS -X POST https://dify.anfitriao.app.br/console/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@gedi.app.br","name":"Gedi","password":"SuaSenha1234"}' \
  -w "\n--- HTTP %{http_code}\n"

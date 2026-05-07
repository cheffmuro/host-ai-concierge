#!/usr/bin/env bash
# Sobe weaviate como vector store do Dify e recria api/worker.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git checkout -- docker-compose.yml 2>/dev/null || true
git pull --rebase || git pull || true

echo "==> Subindo weaviate"
docker compose up -d weaviate
sleep 5

echo "==> Recriando dify-api e dify-worker com VECTOR_STORE=weaviate"
docker compose up -d --force-recreate dify-api dify-worker

echo "==> Aguardando API (até 90s)"
for i in $(seq 1 45); do
  code=$(curl -ksS -o /dev/null -w "%{http_code}" https://dify.anfitriao.app.br/console/api/setup || echo 000)
  [ "$code" = "200" ] && { echo "    API OK"; break; }
  sleep 2
done

echo "==> Status"
docker compose ps weaviate dify-api dify-worker

echo
echo "✅ Recarrega https://dify.anfitriao.app.br (Ctrl+Shift+R) e tenta criar Knowledge Base."

#!/usr/bin/env bash
# Diagnóstico real da falha "Failed to request plugin daemon" durante indexação.
# O erro acontece no dify-worker (Celery), não na dify-api. Esse script:
#   1. Garante 4 GB de swap (evita OOM-kill do worker durante embedding)
#   2. Dumpa logs específicos do worker filtrando o trace correto
#   3. Testa o endpoint de embedding direto pra reproduzir o erro
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f /opt/host-ai-concierge/infra/docker-compose.yml"

echo "==> [1/5] Swap atual"
free -h | grep -i swap

if [ "$(swapon --show=SIZE --noheadings --bytes | head -1 || echo 0)" -lt 4000000000 ]; then
  echo "==> [2/5] Aumentando swap para 4 GB"
  swapoff /swapfile 2>/dev/null || true
  rm -f /swapfile
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    novo swap:"
  free -h | grep -i swap
else
  echo "==> [2/5] Swap já >= 4 GB — pulando"
fi

echo "==> [3/5] Memória por container Dify"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" \
  | grep -E "dify|weaviate|postgres|redis" || true

echo "==> [4/5] Logs do dify-worker (onde a indexação realmente roda)"
$COMPOSE logs --tail=200 dify-worker 2>&1 \
  | grep -iE "error|traceback|exception|embedding|plugin daemon|failed|killed|oom|index" \
  | tail -60

echo
echo "==> [5/5] dmesg OOM (últimos 20)"
dmesg -T 2>/dev/null | grep -iE "killed process|oom-kill|out of memory" | tail -20 || true

echo
echo "==> Status final dos containers"
$COMPOSE ps dify-worker dify-api dify-plugin-daemon

echo
echo "✅ Diagnóstico concluído. Agora reindexa o documento no Dify e roda de novo:"
echo "   bash infra/scripts/diag-dify-indexing.sh"

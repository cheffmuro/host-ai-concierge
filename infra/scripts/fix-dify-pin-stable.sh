#!/usr/bin/env bash
# Pina o stack Dify em combo estável: api/web 1.14.0 + plugin-daemon 0.5.3-local
# + sandbox 0.2.14. (Banco já tem migração 227822d22895 do 1.14.0.) Resolve:
#   - 500 em /datasets/create (rota /management/datasources passa a existir no
#     plugin-daemon 0.3.x+).
#   - "Can't locate revision 227822d22895" do downgrade para 1.4.0 (o banco já
#     tinha migrações de versões mais novas, sem path de rollback).
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Resetando alterações locais e puxando última versão"
git stash push -u -m "fix-dify-pin-stable autostash $(date +%s)" >/dev/null 2>&1 || true
git checkout -- . 2>/dev/null || true
git pull --rebase origin main 2>/dev/null || git pull origin main || true

cd infra

echo "==> Pull das imagens pinadas"
docker compose pull dify-api dify-web dify-plugin-daemon dify-sandbox || true

echo "==> Recriando dify-api, dify-worker, dify-web, dify-plugin-daemon, dify-sandbox"
docker compose up -d --force-recreate dify-plugin-daemon dify-sandbox dify-api dify-worker dify-web

echo "==> Aguardando API (até 180s) — primeiro boot roda flask db upgrade"
ok=0
for i in $(seq 1 90); do
  code=$(curl -ksS -o /dev/null -w "%{http_code}" https://dify.anfitriao.app.br/console/api/setup || echo 000)
  if [ "$code" = "200" ]; then echo "    API OK após ${i} tentativas"; ok=1; break; fi
  sleep 2
done
[ "$ok" = "1" ] || echo "    !! API não respondeu 200 — veja logs abaixo"

echo "==> Probe: plugin-daemon /health"
docker compose exec -T dify-api sh -c "curl -sf http://dify-plugin-daemon:5002/health 2>&1 | head -3 || echo FAIL" || true

echo "==> Logs recentes dify-api (filtrando erros)"
docker compose logs --tail=80 dify-api | grep -iE "error|404|500|datasource|migrat|revision" | tail -30 || echo "    (sem erros relevantes)"

echo "==> Versões em execução"
docker compose images dify-api dify-web dify-plugin-daemon dify-sandbox

echo
echo "✅ Recarrega https://dify.anfitriao.app.br (Ctrl+Shift+R) e tenta criar Knowledge."
echo "   Confere em Settings → Model Provider que há um Embedding model configurado."

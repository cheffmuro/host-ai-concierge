#!/usr/bin/env bash
# Pina o stack Dify em um combo estável (api/web 1.4.0 + plugin-daemon 0.1.2-local).
# Resolve o 500 em /datasets/create causado por mismatch entre dify-api:latest
# e plugin-daemon (rota /management/datasources não existe nas versões pinadas
# então o front passa a usar o fluxo legado, que funciona).
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Resetando alterações locais e puxando última versão"
git stash push -u -m "fix-dify-pin-stable autostash $(date +%s)" >/dev/null 2>&1 || true
git checkout -- . 2>/dev/null || true
git pull --rebase origin main 2>/dev/null || git pull origin main || true

cd infra

echo "==> Pull das imagens pinadas"
docker compose pull dify-api dify-web dify-plugin-daemon || true

echo "==> Recriando dify-api, dify-worker, dify-web e dify-plugin-daemon"
docker compose up -d --force-recreate dify-plugin-daemon dify-api dify-worker dify-web

echo "==> Aguardando API (até 120s)"
for i in $(seq 1 60); do
  code=$(curl -ksS -o /dev/null -w "%{http_code}" https://dify.anfitriao.app.br/console/api/setup || echo 000)
  [ "$code" = "200" ] && { echo "    API OK após ${i} tentativas"; break; }
  sleep 2
done

echo "==> Probe: endpoint que estava dando 404 no plugin-daemon"
docker compose exec -T dify-api sh -c "wget -qO- --header='Content-Type: application/json' http://dify-plugin-daemon:5002/health 2>&1 | head -5" || true

echo "==> Probe: criar dataset via API console (com cookie de sessão é melhor, mas tentamos sem só pra ver o 500/401)"
curl -ksS -o /tmp/datasets_probe.json -w "HTTP=%{http_code}\n" \
  https://dify.anfitriao.app.br/console/api/datasets \
  -H "Content-Type: application/json"
echo "    Resposta:"
head -c 500 /tmp/datasets_probe.json; echo

echo "==> Logs recentes dify-api (filtrando erros)"
docker compose logs --tail=60 dify-api | grep -iE "error|404|500|datasource|embedding" | tail -30 || echo "    (sem erros no tail)"

echo "==> Versões em execução"
docker compose images dify-api dify-web dify-plugin-daemon

echo
echo "✅ Recarrega https://dify.anfitriao.app.br com Ctrl+Shift+R, vai em Conhecimento → Criar."
echo "   Garante que em Settings → Model Provider → System Model há um Embedding model definido."

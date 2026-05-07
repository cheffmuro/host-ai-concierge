#!/usr/bin/env bash
# Atualiza o plugin-daemon para versão compatível com Dify latest.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git checkout -- docker-compose.yml 2>/dev/null || true
git pull --rebase || git pull || true

echo "==> Pull da nova imagem do plugin-daemon"
docker compose pull dify-plugin-daemon

echo "==> Recriando plugin-daemon + api + web"
docker compose up -d --force-recreate dify-plugin-daemon dify-api dify-web

echo "==> Aguardando plugin-daemon (até 90s)"
for i in $(seq 1 45); do
  if docker compose exec -T dify-plugin-daemon sh -c "wget -qO- http://localhost:5002/health 2>/dev/null || ss -tln | grep -q ':5002'" >/dev/null 2>&1; then
    echo "    plugin-daemon OK"
    break
  fi
  sleep 2
done

echo "==> Aguardando API"
for i in $(seq 1 45); do
  code=$(curl -ksS -o /dev/null -w "%{http_code}" https://dify.anfitriao.app.br/console/api/setup || echo 000)
  [ "$code" = "200" ] && { echo "    API OK"; break; }
  sleep 2
done

echo "==> Versão em execução"
docker compose images dify-plugin-daemon

echo "==> Logs recentes"
docker compose logs --tail=30 dify-plugin-daemon | tail -30

echo
echo "✅ Recarrega https://dify.anfitriao.app.br (Ctrl+Shift+R) e tenta criar Knowledge."

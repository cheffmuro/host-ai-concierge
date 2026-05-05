#!/usr/bin/env bash
# Sobe a stack (idempotente) e valida saúde de todos os containers.
# Falha em qualquer container `exited` ou `unhealthy` após 180s.
set -uo pipefail

cd "$(dirname "$0")/.."
PROJECT="${COMPOSE_PROJECT_NAME:-host-ai-concierge}"
TIMEOUT=180

echo "→ Validando docker-compose.yml"
docker compose -p "$PROJECT" config -q || { echo "❌ compose config inválido"; exit 1; }

echo "→ docker compose up -d --remove-orphans"
docker compose -p "$PROJECT" up -d --remove-orphans

services=$(docker compose -p "$PROJECT" config --services)
echo "→ Aguardando saúde (até ${TIMEOUT}s) de:"
echo "$services" | sed 's/^/    - /'

deadline=$(( $(date +%s) + TIMEOUT ))
declare -A done_state
fail=0

while [ "$(date +%s)" -lt "$deadline" ]; do
  all_ok=1
  for svc in $services; do
    [ "${done_state[$svc]:-}" = "ok" ] && continue

    cid=$(docker compose -p "$PROJECT" ps -q "$svc" 2>/dev/null || true)
    if [ -z "$cid" ]; then
      all_ok=0
      continue
    fi

    state=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo "missing")
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "none")

    case "$state" in
      exited|dead)
        echo "❌ $svc terminou ($state)"
        docker compose -p "$PROJECT" logs --tail=80 "$svc" || true
        done_state[$svc]="fail"; fail=$((fail+1))
        ;;
      running)
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
          echo "✅ $svc ($state${health:+/${health}})"
          done_state[$svc]="ok"
        elif [ "$health" = "unhealthy" ]; then
          echo "❌ $svc unhealthy"
          docker compose -p "$PROJECT" logs --tail=80 "$svc" || true
          done_state[$svc]="fail"; fail=$((fail+1))
        else
          all_ok=0
        fi
        ;;
      *)
        all_ok=0
        ;;
    esac
  done

  if [ "$all_ok" = "1" ]; then
    break
  fi
  sleep 5
done

# Marca pendentes como falha
for svc in $services; do
  if [ -z "${done_state[$svc]:-}" ]; then
    echo "❌ $svc não ficou saudável em ${TIMEOUT}s"
    docker compose -p "$PROJECT" logs --tail=80 "$svc" || true
    fail=$((fail+1))
  fi
done

if [ "$fail" -gt 0 ]; then
  echo
  echo "⚠️  $fail serviço(s) com problema. Investigue os logs acima."
  exit 1
fi

echo
echo "✅ Todos os containers saudáveis. Rodando checks externos..."
echo
bash "$(dirname "$0")/validate.sh"

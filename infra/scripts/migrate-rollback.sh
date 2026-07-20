#!/usr/bin/env bash
# Rollback: derruba 'host-ai-concierge' e sobe 'anfitriao' reusando volumes antigos.
# Se <stamp> for passado, restaura tar.gz para volumes anfitriao_* antes de subir.
#
# Uso:
#   bash scripts/migrate-rollback.sh                   # reusa volumes anfitriao_* intactos
#   bash scripts/migrate-rollback.sh 20260505_143000   # restaura backup específico
set -uo pipefail

cd "$(dirname "$0")/.."

OLD="anfitriao"
NEW="host-ai-concierge"
STAMP="${1:-}"
VOLUMES=(postgres_data redis_data chatwoot_storage dify_storage evolution_instances caddy_data caddy_config)

echo "═══ Rollback ${NEW} → ${OLD} ═══"

# 1. Para a stack nova
echo "→ Parando stack '${NEW}'"
docker compose -p "$NEW" down 2>/dev/null || true

# 2. Restaura backup, se solicitado
if [ -n "$STAMP" ]; then
  BACKUP_DIR="backups/migration_${STAMP}"
  [ -d "$BACKUP_DIR" ] || { echo "❌ $BACKUP_DIR não existe"; exit 1; }

  echo "→ Restaurando volumes ${OLD}_* a partir de $BACKUP_DIR"
  for vol in "${VOLUMES[@]}"; do
    tar="$BACKUP_DIR/${vol}.tar.gz"
    [ -f "$tar" ] || { echo "    skip $vol (sem backup)"; continue; }

    docker volume create "${OLD}_${vol}" >/dev/null
    echo "    restore $vol"
    docker run --rm \
      -v "${OLD}_${vol}:/data" \
      -v "$(pwd)/${BACKUP_DIR}:/backup:ro" \
      alpine sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /backup/${vol}.tar.gz -C /data"
  done
fi

# 3. Confirma que volumes antigos existem
missing=0
for vol in "${VOLUMES[@]}"; do
  if ! docker volume inspect "${OLD}_${vol}" >/dev/null 2>&1; then
    echo "❌ Volume ${OLD}_${vol} não existe — passe um <stamp> de backup"
    missing=1
  fi
done
[ "$missing" = "1" ] && exit 1

# 4. Sobe a stack antiga
echo "→ Subindo stack '${OLD}'"
COMPOSE_PROJECT_NAME="$OLD" docker compose -p "$OLD" up -d

echo
echo "✅ Rollback concluído. Stack '${OLD}' no ar."
echo "   Stack '${NEW}' parada (volumes ${NEW}_* preservados)."

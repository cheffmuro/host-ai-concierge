#!/usr/bin/env bash
# Backup diário: dump dos DBs + snapshot dos volumes Redis/Chatwoot/Dify.
# Agendar via cron: 0 3 * * * /caminho/infra/scripts/backup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
. ./.env

STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="backups/$STAMP"
mkdir -p "$DEST"

echo "→ Dump Postgres (chatwoot, dify)"
for db in chatwoot dify; do
  docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-host-ai-concierge}" "$db" \
    | gzip > "$DEST/$db.sql.gz"
done

echo "→ Snapshot volumes"
for vol in chatwoot_storage dify_storage evolution_instances; do
  docker run --rm \
    -v "host-ai-concierge_${vol}:/data:ro" \
    -v "$(pwd)/$DEST:/backup" \
    alpine tar czf "/backup/${vol}.tar.gz" -C /data .
done

# Retenção: 14 dias
find backups -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "✅ Backup em $DEST"

#!/usr/bin/env bash
# Migração 1-clique: stack 'anfitriao' → 'host-ai-concierge'.
# Idempotente. Backup completo + rollback rápido.
#
# Uso:
#   bash scripts/migrate-from-anfitriao.sh                   # interativo
#   bash scripts/migrate-from-anfitriao.sh --yes             # sem prompt
#   bash scripts/migrate-from-anfitriao.sh --yes --auto-rollback
set -uo pipefail

cd "$(dirname "$0")/.."

OLD="anfitriao"
NEW="host-ai-concierge"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="backups/migration_${STAMP}"
VOLUMES=(postgres_data redis_data chatwoot_storage dify_storage evolution_instances caddy_data caddy_config)
DBS=(chatwoot dify)

YES=0; AUTO_ROLLBACK=0
for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    --auto-rollback) AUTO_ROLLBACK=1 ;;
    *) echo "Flag desconhecida: $arg"; exit 2 ;;
  esac
done

# ---------- [0] Pré-checks ----------
echo "═══ Migração ${OLD} → ${NEW} ═══"
[ -f .env ] || { echo "❌ .env ausente — rode bootstrap primeiro"; exit 1; }
. ./.env

if ! docker compose -p "$OLD" ps -q | grep -q .; then
  if docker volume ls --format '{{.Name}}' | grep -q "^${OLD}_"; then
    echo "ℹ️  Stack antiga parada, mas volumes ${OLD}_* existem. Prosseguindo."
  else
    echo "ℹ️  Nenhum vestígio da stack '${OLD}'. Apenas subindo a nova."
    bash scripts/up-and-check.sh
    exit $?
  fi
fi

if [ "$YES" -ne 1 ]; then
  echo
  echo "Esta operação:"
  echo "  1. Faz backup em $BACKUP_DIR (pg_dump + tar dos volumes)"
  echo "  2. Para a stack '${OLD}' (sem apagar dados)"
  echo "  3. Copia volumes ${OLD}_* → ${NEW}_*"
  echo "  4. Sobe a stack '${NEW}' e valida"
  echo
  read -r -p "Continuar? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Abortado."; exit 0; }
fi

mkdir -p "$BACKUP_DIR"

rollback() {
  echo
  echo "⚠️  Erro detectado — iniciando rollback automático"
  bash scripts/migrate-rollback.sh "$STAMP" || true
  exit 1
}

# ---------- [1] Backup ----------
echo
echo "→ [1/4] Backup completo da stack '${OLD}' em $BACKUP_DIR"

old_pg=$(docker compose -p "$OLD" ps -q postgres 2>/dev/null || true)
if [ -n "$old_pg" ]; then
  for db in "${DBS[@]}"; do
    echo "    pg_dump $db"
    docker exec -i "$old_pg" pg_dump -U "${POSTGRES_USER:-${OLD}}" "$db" \
      | gzip > "$BACKUP_DIR/${db}.sql.gz" || { [ "$AUTO_ROLLBACK" = "1" ] && rollback; exit 1; }
  done
else
  echo "    (postgres antigo não está rodando — pulando pg_dump; tar dos volumes ainda preserva os dados)"
fi

for vol in "${VOLUMES[@]}"; do
  if docker volume inspect "${OLD}_${vol}" >/dev/null 2>&1; then
    echo "    snapshot ${OLD}_${vol}"
    docker run --rm \
      -v "${OLD}_${vol}:/data:ro" \
      -v "$(pwd)/${BACKUP_DIR}:/backup" \
      alpine tar czf "/backup/${vol}.tar.gz" -C /data . \
      || { [ "$AUTO_ROLLBACK" = "1" ] && rollback; exit 1; }
  fi
done

# Manifesto
docker compose -p "$OLD" config 2>/dev/null > "$BACKUP_DIR/old-compose.yml" || true
echo "$STAMP" > "$BACKUP_DIR/STAMP"
echo "    ✅ Backup concluído"

# ---------- [2] Stop antiga ----------
echo
echo "→ [2/4] Parando stack '${OLD}' (volumes preservados)"
docker compose -p "$OLD" stop || true

# ---------- [3] Copia volumes ----------
echo
echo "→ [3/4] Copiando volumes ${OLD}_* → ${NEW}_*"
for vol in "${VOLUMES[@]}"; do
  src="${OLD}_${vol}"
  dst="${NEW}_${vol}"

  if ! docker volume inspect "$src" >/dev/null 2>&1; then
    echo "    skip $vol (origem não existe)"
    continue
  fi

  # Cria destino se não existir
  docker volume create "$dst" >/dev/null

  # Idempotência: se destino já tem dados, pula
  if docker run --rm -v "$dst:/data" alpine sh -c '[ -n "$(ls -A /data 2>/dev/null)" ]'; then
    echo "    skip $vol (destino já populado)"
    continue
  fi

  echo "    copy $vol"
  docker run --rm \
    -v "$src:/from:ro" \
    -v "$dst:/to" \
    alpine sh -c 'cp -a /from/. /to/' \
    || { [ "$AUTO_ROLLBACK" = "1" ] && rollback; exit 1; }
done

# ---------- [4] Up nova + valida ----------
echo
echo "→ [4/4] Subindo stack '${NEW}' e validando"
if ! bash scripts/up-and-check.sh; then
  echo "❌ Validação falhou"
  [ "$AUTO_ROLLBACK" = "1" ] && rollback
  echo "    Para reverter manualmente: bash scripts/migrate-rollback.sh $STAMP"
  exit 1
fi

echo
echo "═══ ✅ Migração concluída ═══"
echo
echo "Próximos passos:"
echo "  • Backup salvo em:        $BACKUP_DIR"
echo "  • Rollback (volumes ok):  bash scripts/migrate-rollback.sh"
echo "  • Rollback (do backup):   bash scripts/migrate-rollback.sh $STAMP"
echo "  • Remover stack antiga:   docker compose -p ${OLD} down -v"
echo "    (⚠️  apaga volumes ${OLD}_*; só rode após confirmar que a nova stack"
echo "     está estável por alguns dias)"

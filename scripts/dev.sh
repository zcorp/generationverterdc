#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PROJECT_ROOT="$(pwd)"
PROJECT_NAME="gv-rdc-site"
COMPOSE="docker compose -p ${PROJECT_NAME}"
CLEAN_ENV="0"
RESET_MODE="0"

usage() {
  echo "Usage: ./scripts/dev.sh [--clean] [--reset]" >&2
  echo "  --clean  : stop containers and recreate DB volume" >&2
  echo "  --reset  : clear Next.js cache and rebuild app from scratch" >&2
  exit 1
}

if [[ "${1:-}" == "--clean" ]]; then
  CLEAN_ENV="1"
  shift
fi

if [[ "${1:-}" == "--reset" ]]; then
  RESET_MODE="1"
  shift
fi

if [[ $# -gt 0 ]]; then
  usage
fi

info() {
  printf "\n\033[1;32m>> %s\033[0m\n" "$1"
}

clear_next_cache() {
  local target_dir="${PROJECT_ROOT}/app/.next"
  local cache_dir="${PROJECT_ROOT}/app/node_modules/.cache"

  rm -rf "${target_dir}"
  rm -rf "${cache_dir}"

  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "${PROJECT_NAME}-app"; then
    docker exec "${PROJECT_NAME}-app" sh -lc 'rm -rf /app/.next /app/node_modules/.cache' >/dev/null 2>&1 || true
  fi
}

cleanup() {
  info "Nettoyage de l'environnement (${PROJECT_NAME})"
  clear_next_cache

  if [[ "${CLEAN_ENV}" == "1" || "${RESET_MODE}" == "1" ]]; then
    ${COMPOSE} down --volumes --remove-orphans
  else
    ${COMPOSE} down --remove-orphans
  fi

  docker image prune -f --filter "label=com.docker.compose.project=${PROJECT_NAME}" >/dev/null 2>&1 || true
}

# Nettoyage garanti à la sortie du script, quelle que soit la façon dont il se termine
# (Ctrl+C, erreur, ou arrêt normal).
trap cleanup EXIT INT TERM

if [ ! -f .env ]; then
  info "Fichier .env absent, copie de .env.example"
  cp .env.example .env
fi

if [[ "${RESET_MODE}" == "1" ]]; then
  info "Mode reset demandé : cache Next.js nettoyé avant redémarrage"
fi

info "Nettoyage préalable (avant démarrage)"
cleanup

info "Construction des images"
${COMPOSE} build

info "Démarrage de l'environnement (Ctrl+C pour arrêter et nettoyer)"
${COMPOSE} up

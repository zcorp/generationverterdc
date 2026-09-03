#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PROJECT_NAME="gv-rdc-site"
IMAGE="${PROJECT_NAME}-github-pages-build"
CONTAINER="${PROJECT_NAME}-github-pages-export"
OUTPUT_DIR="${OUTPUT_DIR:-dist/github-pages}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"

cleanup() {
	docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
	docker image rm -f "${IMAGE}" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if [ "${DEPLOY_MODE:-github-pages}" != "github-pages" ]; then
	printf 'DEPLOY_MODE doit être github-pages pour produire cet artefact.\n' >&2
	exit 1
fi

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

printf "%s\n" "Construction de l'artefact GitHub Pages..."
docker build \
	--target build \
	--build-arg DEPLOY_MODE=github-pages \
	--build-arg NEXT_PUBLIC_BASE_PATH="${BASE_PATH}" \
	-t "${IMAGE}" \
	./app

docker create --name "${CONTAINER}" "${IMAGE}" >/dev/null
docker cp "${CONTAINER}:/app/out/." "${OUTPUT_DIR}/"
touch "${OUTPUT_DIR}/.nojekyll"

printf 'Artefact statique disponible dans %s\n' "${OUTPUT_DIR}"

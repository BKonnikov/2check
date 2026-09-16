#!/usr/bin/env bash
#
# PRD 27.4 and 27.5 — a release in the order the service requires.
#
# The order is the whole point of this script. The API refuses to store results when the storage
# schema version it was built against is not the one in the database (§19.10), so a release that
# starts the new API before the migration has run takes the site down with "the service is not
# accepting checks" until somebody notices. Building does not start anything, so the safe order
# is: build everything, migrate, then start.
#
# Run from the checkout on the server:
#   ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE=docker-compose.prod.yml
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

git pull --ff-only

# The image tag and the version the service reports are the same commit, so a running container
# can always be traced back to the source it was built from.
APPLICATION_RELEASE_VERSION="$(git rev-parse --short HEAD)"
export APPLICATION_RELEASE_VERSION
echo "==> release ${APPLICATION_RELEASE_VERSION}"

echo "==> building"
compose build api web

echo "==> migrating"
compose --profile migrate run --rm migrate

echo "==> starting"
compose up -d api web

echo "==> waiting for readiness"
for _ in $(seq 1 30); do
  if compose exec -T api node -e \
    'fetch("http://127.0.0.1:3001/readyz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' \
    2>/dev/null; then
    echo "==> ${APPLICATION_RELEASE_VERSION} is live"
    exit 0
  fi
  sleep 2
done

echo "!! the API did not become ready; check: compose logs --tail=50 api" >&2
exit 1

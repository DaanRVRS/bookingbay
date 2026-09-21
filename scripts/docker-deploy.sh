#!/usr/bin/env bash
# Bouwt en start BookingBay in Docker. De deploy-wachter draait dit vanzelf bij een
# nieuwe commit (main op de hoofdserver, test op de testserver). Met de hand:
#   bash /var/www/bookingbay/scripts/docker-deploy.sh
#
# Terug naar de vorige versie:
#   cd /var/www/bookingbay && docker tag bookingbay-web:vorige bookingbay-web:latest && docker compose up -d --no-build
set -euo pipefail
cd "$(dirname "$0")/.."

# Bouwen kost een paar gigabyte. Loopt de schijf vol, dan valt ook de database
# om (dat gebeurde op 21-09-2026), dus liever niet beginnen.
vrij_gb=$(( $(df --output=avail -k / | tail -1) / 1024 / 1024 ))
if [ "$vrij_gb" -lt 4 ]; then
  echo "Nog maar ${vrij_gb} GB vrij op de schijf; bouwen gestopt. Ruim eerst op: docker builder prune -af" >&2
  exit 1
fi

# Eerst bouwen terwijl de huidige versie gewoon doordraait.
if docker image inspect bookingbay-web:latest >/dev/null 2>&1; then
  docker tag bookingbay-web:latest bookingbay-web:vorige
fi
docker compose build

# Databasemigraties met de nieuwe versie, vóór die live gaat.
docker compose run --rm --no-deps web node_modules/.bin/prisma migrate deploy

# De container draait als gebruiker 1000 (node) en schrijft uploads weg.
mkdir -p public/uploads
chown -R 1000:1000 public/uploads

docker compose up -d --wait
docker image prune -f >/dev/null
docker builder prune -af >/dev/null
echo "BookingBay draait: $(docker compose ps --format '{{.Status}}')"
curl -fsS http://127.0.0.1:3001/api/health && echo

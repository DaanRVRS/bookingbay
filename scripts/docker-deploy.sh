#!/usr/bin/env bash
# Bouwt en start BookingBay in Docker. Draait op de server in /var/www/bookingbay,
# vanuit de GitHub-deploy (na git reset) of met de hand:
#   bash /var/www/bookingbay/scripts/docker-deploy.sh
#
# Terug naar de vorige versie:
#   cd /var/www/bookingbay && docker tag bookingbay-web:vorige bookingbay-web:latest && docker compose up -d --no-build
set -euo pipefail
cd "$(dirname "$0")/.."

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
echo "BookingBay draait: $(docker compose ps --format '{{.Status}}')"
curl -fsS http://127.0.0.1:3001/api/health && echo

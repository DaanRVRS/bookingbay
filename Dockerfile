# BookingBay. Wordt op de server gebouwd door scripts/docker-deploy.sh (ook wat
# de GitHub-deploy draait); zie compose.yml. De instellingen staan in
# /etc/bookingbay/.env.production. Het bouwen heeft ze nodig (sitemap en
# robots.txt nemen het domein over), dus ze komen binnen als build secret:
# alleen tijdens die ene stap, niet in de image.

FROM node:22-bookworm-slim AS base
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
# Prisma heeft openssl nodig.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@10.33.2 \
 && npm cache clean --force
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN --mount=type=secret,id=appenv,required=true \
    set -a && . /run/secrets/appenv && set +a \
 && pnpm prisma generate \
 && pnpm build \
 && rm -rf .next/cache

FROM base
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 TZ=Europe/Amsterdam
# Alles blijft erin, ook de Prisma-CLI: de deploy draait daarmee de migraties.
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3001
CMD ["node_modules/.bin/next", "start", "-p", "3001"]

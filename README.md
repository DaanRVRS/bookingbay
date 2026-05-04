# BookingBay

Multi-tenant SaaS-platform voor verhuurbedrijven. Beheerplatform op `app.bookingbay.{nl}`,
publieke tenant-sites op `{slug}.bookingbay.{nl}` of eigen domein.

## Stack

- **Next.js 16** App Router · TypeScript strict · Turbopack
- **Tailwind CSS v4** · shadcn/ui · Sonner · Lucide
- **PostgreSQL** + **Prisma 6**
- **Auth.js v5** (credentials + magic link)
- **Mollie** voor abonnementen (M2)
- **Resend** voor transactionele e-mail (console-fallback in dev)
- **pnpm** als package manager · **Node 20.20+**

## Lokale setup

### 1. Node-versie

Project pint Node via `.node-version`. Met [`fnm`](https://github.com/Schniz/fnm):

```bash
fnm use   # picks up .node-version
```

### 2. Dependencies

```bash
pnpm install
```

### 3. Database via SSH-tunnel

Postgres draait op de Hetzner-server. Voor lokale dev open je een tunnel in een
aparte terminal die je open laat staan:

```bash
ssh -L 5432:localhost:5432 root@178.104.86.251
```

Daarna lijkt `localhost:5432` lokaal naar de remote `bookingbay_dev` database
te wijzen.

### 4. Environment

```bash
cp .env.example .env
```

Vul `DATABASE_URL` in met het werkelijke wachtwoord (zie 1Password).

### 5. Schema toepassen

```bash
pnpm db:migrate     # past pending migrations toe op bookingbay_dev
pnpm db:seed        # vult demo-data
```

### 6. Dev server

```bash
pnpm dev
```

Open [http://app.lvh.me:3001](http://app.lvh.me:3001) — `lvh.me` resolved naar 127.0.0.1
en ondersteunt wildcards, dus `acme.lvh.me:3001` werkt automatisch zodra de
tenant-routes er zijn (M2).

## Scripts

| Command           | Doet                                         |
| ----------------- | -------------------------------------------- |
| `pnpm dev`        | Next.js dev server (Turbopack) op poort 3001 |
| `pnpm build`      | Productie-build                              |
| `pnpm start`      | Productie-server op poort 3001               |
| `pnpm lint`       | ESLint                                       |
| `pnpm typecheck`  | `tsc --noEmit`                               |
| `pnpm format`     | Prettier                                     |
| `pnpm test`       | Vitest unit tests                            |
| `pnpm test:e2e`   | Playwright E2E                               |
| `pnpm db:migrate` | `prisma migrate dev`                         |
| `pnpm db:deploy`  | `prisma migrate deploy` (productie)          |
| `pnpm db:studio`  | Prisma Studio                                |
| `pnpm db:seed`    | Vult demo-data                               |

## Productie

### Server-layout

```
/var/www/bookingbay         # git checkout van deze repo
/etc/bookingbay/.env.production    # secrets (DATABASE_URL, NEXTAUTH_SECRET, ...)
/etc/nginx/sites-enabled/bookingbay  # nginx server-block
```

`/var/www/bookingbay/.env.production` is een symlink naar `/etc/bookingbay/.env.production`
zodat secrets nooit in de checkout staan.

### Deploy

Push naar `main` triggert `.github/workflows/deploy.yml`. Daarvoor zijn drie
GitHub repo-secrets nodig:

- `SSH_HOST` — server-IP
- `SSH_USER` — `root`
- `SSH_PRIVATE_KEY` — private key, public part staat in `~/.ssh/authorized_keys`
  op de server

Eerste deploy verwacht dat de checkout al bestaat — zie _bootstrap_ hieronder.

### Bootstrap (eenmalig)

```bash
# SSH naar server
cd /var/www/bookingbay
git clone https://github.com/DaanRVRS/bookingbay.git .
ln -sf /etc/bookingbay/.env.production .env.production
```

Vanaf dat moment doet GitHub Actions de rest. De workflow draait:

1. `git fetch origin main && git reset --hard origin/main`
2. `pnpm install --frozen-lockfile`
3. `pnpm prisma migrate deploy`
4. `pnpm build`
5. `pm2 reload bookingbay --update-env` (of `pm2 start ecosystem.config.cjs` bij eerste run)
6. Health check tegen `/api/health`

### URL

- Beheerplatform: `http://bookingbay.178-104-86-251.nip.io` (M1, HTTP only)
- Tenant-sites: `http://{slug}.bookingbay.178-104-86-251.nip.io` (M2)

Zodra een echt domein is gekoppeld vervangen we de nginx-config en zetten
Certbot erop.

## Architectuur

### Multi-tenancy

Shared database, shared schema. Elke tenant-tabel heeft `organizationId`. Zie
[Prisma schema](prisma/schema.prisma).

Tenant-detection:

- `app.{rootdomain}` of het server-IP zelf → beheerplatform, auth bepaalt
  welke organisatie(s).
- `{slug}.{rootdomain}` of `customDomain` → publieke tenant-site, hostname
  wordt door middleware gematcht tegen `Organization.slug` of
  `Organization.customDomain`.

Alle queries op tenant-data lopen via een `requireOrg(...)` helper die
`organizationId` afdwingt. Geen rauwe queries op tenant-tabellen zonder
org-scope.

### Rollen

Many-to-many `User ↔ Organization` via `Membership` met `Role` enum:
`OWNER | ADMIN | MANAGER | VIEWER`. Permission-checks via een
`can(user, action, resource)` helper, gebruikt in server actions én in de UI
om knoppen te tonen/verbergen.

## Roadmap

**M1 — beheer-MVP**: auth, orgs, categorieën, items, klanten, boekingen,
planning, landing page, deploy. _In aanbouw._

**M2 — tenant-sites**: publieke `{slug}` sites, customizer, custom domains,
Mollie, plan-limieten.

**Later**: online betaalde boekingen, voorraad-tracking met serial numbers,
multi-locatie, eigen API, mobile, meertaligheid.

// 4GB host + 4GB swap, deelt RAM met voidplugins + Caddy + Postgres.
//
// Cluster met 2 instances: één fork-instance betekende dat ALLE requests
// serieel door 1 Node-process gingen — een zware dashboard-render blokt
// dan widget-bezoekers. Met 2 workers verdubbelt onze concurrency zonder
// dat we de box opstoken: 2 × ~750M old-space + headroom = ~1.6GB voor
// Next, ruim onder de 4GB+swap die we delen met Postgres/Caddy/voidplugins.
//
// max_memory_restart per instance: pm2 ziet workers afzonderlijk, dus
// 800M per worker (2 × 800M = 1.6GB hard cap). --max-old-space-size=750
// hint zorgt dat Node GC'ed onder die grens i.p.v. te crashen.
module.exports = {
  apps: [
    {
      name: "bookingbay",
      cwd: "/var/www/bookingbay",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      interpreter: "node",
      node_args: "--max-old-space-size=750",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        // De Hetzner-box draait in UTC. Naïeve datetime-strings uit de
        // boek-widget ("2026-07-31T09:00", géén tz-suffix) werden daardoor
        // als 09:00 UTC gelezen i.p.v. 09:00 NL — waardoor server en
        // browser het oneens waren over bezette tijdsloten (kalender groen
        // maar alle uren "vol"). Dit hele product is NL-lokaal (openings-
        // tijden, klanten), dus laten we Node in Europe/Amsterdam rekenen:
        // naïeve tijden = NL-tijd, consistent met tenant + browser. IANA-tz
        // handelt zomer/wintertijd automatisch af.
        TZ: "Europe/Amsterdam",
      },
      time: true,
    },
  ],
};

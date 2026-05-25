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
      },
      time: true,
    },
  ],
};

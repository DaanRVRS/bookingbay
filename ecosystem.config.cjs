// 4GB host + 4GB swap, deelt RAM met voidplugins + Caddy + Postgres.
// max_memory_restart stond op 512M → onder normale load tikte Next
// daar bovenop, kreeg een SIGKILL en startte koud opnieuw → traag.
// 1500M geeft ruimte voor piek-load (renders + Prisma) zonder ander
// werk op de box te verdringen. --max-old-space-size hint Node om
// daaronder GC te doen i.p.v. te crashen.
module.exports = {
  apps: [
    {
      name: "bookingbay",
      cwd: "/var/www/bookingbay",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      interpreter: "node",
      node_args: "--max-old-space-size=1400",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1500M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      time: true,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "bookingbay",
      cwd: "/var/www/bookingbay",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      time: true,
    },
  ],
};

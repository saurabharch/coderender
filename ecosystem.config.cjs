module.exports = {
  apps: [
    {
      name: "coderender",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3100",
      cwd: __dirname,
      env: { NODE_ENV: "production", PORT: "3100" },
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 5,
      max_memory_restart: "512M",
    },
  ],
};

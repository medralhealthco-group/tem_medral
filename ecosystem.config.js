/**
 * ecosystem.config.js — PM2 Process Manager Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js              # Start production cluster
 *   pm2 start ecosystem.config.js --env dev    # Start development single process
 *   pm2 reload ecosystem.config.js             # Zero-downtime reload in cluster mode
 *   pm2 stop ecosystem.config.js               # Stop all processes
 *   pm2 delete ecosystem.config.js             # Remove from PM2
 *   pm2 logs medral-health                     # View logs
 *   pm2 monit                                  # Live CPU/memory dashboard
 */

module.exports = {
  apps: [
    {
      // ── Application Identity ───────────────────────────────────────────────
      name: "medral-health",
      script: "server.js",
      cwd: "./",

      // ── Cluster Mode — one worker per CPU core ─────────────────────────────
      // Enables zero-downtime reloads via `pm2 reload`.
      // For Hostinger shared hosting, set instances: 1 instead.
      instances: "max",
      exec_mode: "cluster",

      // ── Restart Behaviour ─────────────────────────────────────────────────
      // Restart automatically if the process exits unexpectedly
      autorestart: true,
      // Wait 3 seconds before restarting a crashed process
      restart_delay: 3000,
      // Stop restarting if the process crashes more than 10 times within 10 minutes
      max_restarts: 10,
      min_uptime: "10s",
      // Watch mode disabled in production — use a CI/CD deploy instead
      watch: false,

      // ── Memory Threshold ──────────────────────────────────────────────────
      // Restart if memory exceeds 512 MB (adjust per server RAM)
      max_memory_restart: "512M",

      // ── Environment Variables ─────────────────────────────────────────────
      // These are merged with the OS environment when PM2 starts the app.
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        LOG_LEVEL: "info"
      },

      // ── Logging ───────────────────────────────────────────────────────────
      // Absolute or relative paths to log files.
      // PM2 rotates logs automatically with the pm2-logrotate module.
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      // Prefix each log line with a timestamp
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // ── Graceful Shutdown ─────────────────────────────────────────────────
      // Send SIGTERM first; PM2 waits kill_timeout ms before SIGKILL.
      kill_timeout: 15000,
      // PM2 waits listen_timeout ms for the process to go online after a restart.
      listen_timeout: 10000,

      // ── Source Map Support ────────────────────────────────────────────────
      source_map_support: false
    }
  ],

  // ── PM2 Deploy Configuration (Optional) ──────────────────────────────────
  // Fill in these values to enable `pm2 deploy production` for Hostinger VPS.
  deploy: {
    production: {
      user: "node",
      host: "your-hostinger-vps-ip",
      ref: "origin/main",
      repo: "git@github.com:your-org/medrlhealthco.git",
      path: "/var/www/medrlhealthco",
      "post-deploy": "npm ci && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "apt-get install git -y"
    }
  }
};

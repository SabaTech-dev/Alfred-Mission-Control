module.exports = {
  apps: [{
    name: 'alfred-mc',
    script: '/home/joker/.openclaw/workspace/Alfred-Mission-Control/node_modules/.bin/next',
    args: 'start -H 0.0.0.0 -p 3000',
    cwd: '/home/joker/.openclaw/workspace/Alfred-Mission-Control',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '/etc/alfred-mission-control/.env',
    error_file: '/var/log/alfred-mc-error.log',
    out_file: '/var/log/alfred-mc.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

module.exports = {
  apps: [
    {
      name: 'palik-kayit-bot',
      script: 'src/kayit-bot.js',
      max_memory_restart: '300M',
      autorestart: true,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env'
    },
    {
      name: 'palik-moderasyon-bot',
      script: 'src/moderasyon-bot.js',
      max_memory_restart: '300M',
      autorestart: true,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env'
    }
  ]
};

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    launchOptions: {
      executablePath: '/home/ubuntu/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
    },
  },
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

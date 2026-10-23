// @ts-check
const { defineConfig } = require('@playwright/test');

const PORT = process.env.PORT || 3000;

module.exports = defineConfig({
  testDir: './tests',
  // Tests share one in-memory API, so run them one at a time.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: 'node api/server.js',
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: !process.env.CI,
  },
});

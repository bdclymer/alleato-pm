import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... other config ...

  // Option 1: Start dev server automatically and wait for it
  webServer: {
    command: 'npm run dev',
    port: 3000, // Expected port
    reuseExistingServer: !process.env.CI, // Reuse if already running locally
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Option 2: Use dynamic port detection
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000', // Will wait for this URL to respond
    reuseExistingServer: true,
    // The actual port will be available via process.env.PORT in tests
  },

  // Option 3: Multiple possible ports
  use: {
    baseURL: (() => {
      // Check which port is actually being used
      const possiblePorts = [3000, 3001, 3002, 3003];
      // In real implementation, you'd check which port responds
      return process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    })(),
  },
});
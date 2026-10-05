export default {
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000'
  },
  webServer: {
    command: 'node src/server.js',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3000'
    }
  }
};

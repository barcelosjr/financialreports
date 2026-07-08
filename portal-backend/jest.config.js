module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup-env.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};

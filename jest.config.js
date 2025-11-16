module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/server-test.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 10000,
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'FHIR API Backend Test Report',
      outputPath: 'reports/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};

# FHIR API Backend Test Suite

Test suite for Patient FHIR Service (S3) - 21 tests across 5 suites.

## Quick Start

```bash
npm install
npm test
npm run test:coverage
```

## Test Suites

| Suite | Tests | Description |
|-------|-------|-------------|
| S3.TS1 | 1 | Health endpoint |
| S3.TS2 | 8 | Get all patients |
| S3.TS3 | 5 | Get patient by ID |
| S3.TS4 | 3 | Database connection |
| S3.TS5 | 4 | Data transformation |
| **Total** | **21** | |

## Reports

- `reports/test-report.html` - Interactive HTML report
- `reports/test-report-natural-language.txt` - Text report
- `coverage/` - Code coverage reports

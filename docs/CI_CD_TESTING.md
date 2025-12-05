# Continuous Integration Configuration

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: art_hub_test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run tests
        working-directory: ./backend
        run: npm run test:ci
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: art_hub_test_db
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: postgres
          JWT_SECRET: test-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

  mobile-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./mobile
        run: npm ci
      
      - name: Run tests
        working-directory: ./mobile
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./mobile/coverage

  admin-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./admin-dashboard
        run: npm ci
      
      - name: Run tests
        working-directory: ./admin-dashboard
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./admin-dashboard/coverage

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: |
          cd backend && npm audit --audit-level=moderate
          cd ../mobile && npm audit --audit-level=moderate
          cd ../admin-dashboard && npm audit --audit-level=moderate
      
      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'Art Hub'
          path: '.'
          format: 'HTML'
```

## Test Execution Order

1. **Pre-commit**: Unit tests (fast feedback)
2. **Push**: Unit + Integration tests
3. **Pull Request**: Full test suite including E2E
4. **Nightly**: Full suite + Performance + Security scans
5. **Pre-deployment**: Smoke tests on staging

## Coverage Requirements

All PRs must maintain or improve coverage:
- Backend: ≥ 80%
- Mobile: ≥ 75%
- Admin: ≥ 75%

## Performance Benchmarks

Tests fail if:
- API response time p95 > 200ms
- Page load time > 2s
- Failed requests > 1%

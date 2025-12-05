# Testing Strategy

## Overview

Comprehensive testing strategy covering all layers of the Art Hub application across backend, mobile, and admin dashboard.

## Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /--------\
                /Integration\
               /--------------\
              /  Unit Tests    \
             /------------------\
```

## Test Types by Layer

### 1. Unit Tests (70% of tests)
- Individual functions and methods
- Database models
- Utility functions
- Redux reducers and actions
- React components in isolation

### 2. Integration Tests (20% of tests)
- API endpoints with database
- Authentication flows
- Payment processing
- File uploads to S3
- Multiple components working together

### 3. End-to-End Tests (10% of tests)
- Complete user journeys
- Cross-platform functionality
- Critical business flows

### 4. Specialized Tests
- **Security Tests**: SQL injection, XSS, CSRF, authentication bypasses
- **Performance Tests**: Load testing, stress testing, API response times
- **Smoke Tests**: Critical path verification after deployment
- **Contract Tests**: API contract validation
- **Accessibility Tests**: WCAG compliance for web interfaces

## Coverage Goals

- **Backend**: 80% code coverage minimum
- **Mobile**: 75% code coverage minimum
- **Admin Dashboard**: 75% code coverage minimum

## Testing Tools & Frameworks

### Backend (Node.js)
- **Jest** - Test runner and assertions
- **Supertest** - HTTP assertions
- **nock** - HTTP mocking
- **jest-mock-extended** - Enhanced mocking
- **faker** - Test data generation
- **OWASP ZAP** - Security testing
- **artillery** - Load testing

### Mobile (React Native)
- **Jest** - Test runner
- **React Native Testing Library** - Component testing
- **Detox** - E2E testing
- **jest-coverage** - Coverage reporting

### Admin Dashboard (React)
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **MSW** (Mock Service Worker) - API mocking
- **Cypress** - E2E testing
- **axe-core** - Accessibility testing

## Test File Organization

```
backend/
├── __tests__/
│   ├── unit/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── database/
│   ├── e2e/
│   ├── security/
│   └── performance/
├── __mocks__/
└── jest.config.js

mobile/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   ├── redux/
│   │   └── utils/
│   ├── integration/
│   └── e2e/
├── __mocks__/
└── jest.config.js

admin-dashboard/
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── cypress/
└── jest.config.js
```

## Continuous Integration

All tests run automatically on:
- Pull requests
- Merges to main branch
- Nightly builds (full test suite + security scans)

## Test Execution Commands

```bash
# Backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:security      # Security tests
npm run test:coverage      # Generate coverage report
npm run test:watch         # Watch mode

# Mobile
npm test                   # Unit tests
npm run test:e2e          # Detox E2E tests
npm run test:coverage     # Coverage report

# Admin Dashboard
npm test                   # Unit tests
npm run test:e2e          # Cypress E2E tests
npm run test:a11y         # Accessibility tests
npm run test:coverage     # Coverage report
```

## Critical Test Scenarios

### Authentication & Authorization
- ✓ User registration with validation
- ✓ Login with JWT token generation
- ✓ Token refresh mechanism
- ✓ Role-based access control
- ✓ Password reset flow
- ✓ Session timeout
- ✓ Invite code validation

### Art Listing Workflow
- ✓ Artist uploads art with images
- ✓ Admin approves/rejects listing
- ✓ Art appears in feed when approved
- ✓ Promoted listings show more frequently
- ✓ Image upload to S3
- ✓ Multiple images per listing

### Purchase Flow
- ✓ Add to cart
- ✓ Checkout with Stripe
- ✓ Payment processing
- ✓ Order creation
- ✓ 7-day pickup window calculation
- ✓ Pickup confirmation
- ✓ Cancellation with fees

### Artist Payout
- ✓ Commission calculation
- ✓ Stripe Connect transfer
- ✓ Payout tracking
- ✓ Multiple orders in single payout

### Security
- ✓ SQL injection prevention
- ✓ XSS prevention
- ✓ CSRF protection
- ✓ Rate limiting
- ✓ Input validation
- ✓ Authentication bypass attempts
- ✓ Sensitive data exposure

## Performance Benchmarks

- API response time: < 200ms (p95)
- Page load time: < 2s
- Image load time: < 1s
- Database queries: < 50ms (p95)
- Concurrent users: 1000+
- Requests per second: 100+

## Quality Gates

Tests must pass before:
- Merging to main branch
- Deploying to staging
- Deploying to production

Minimum thresholds:
- All E2E tests: 100% pass
- Integration tests: 100% pass
- Unit tests: 100% pass
- Code coverage: 80%+
- Security scan: No critical/high vulnerabilities
- Performance tests: Within benchmarks

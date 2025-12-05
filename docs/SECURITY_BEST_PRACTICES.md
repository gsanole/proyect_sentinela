# Security Best Practices - Art Hub Milwaukee

## Production Deployment Checklist

### Environment Configuration

✅ **Required Environment Variables**
```env
# CRITICAL: Change these in production!
JWT_SECRET=<64+ character random string>
DATABASE_URL=<production-database-url>

# Use strong credentials
POSTGRES_USER=<not "postgres">
POSTGRES_PASSWORD=<strong-password>

# HTTPS only in production
NODE_ENV=production
FRONTEND_URL=https://arthubmilwaukee.com
ADMIN_URL=https://admin.arthubmilwaukee.com
API_URL=https://api.arthubmilwaukee.com

# SMTP for real emails
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=<sendgrid-user>
SMTP_PASS=<sendgrid-api-key>
FROM_EMAIL=noreply@arthubmilwaukee.com

# Security settings
SESSION_EXPIRY_DAYS=30
REFRESH_TOKEN_EXPIRY_DAYS=30
ACCOUNT_LOCK_DURATION_MINUTES=30
MAX_FAILED_LOGIN_ATTEMPTS=5
```

### HTTPS/SSL

✅ **Required for Production**
```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name api.arthubmilwaukee.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

### Database Security

✅ **Production PostgreSQL Configuration**
```sql
-- Create dedicated database user
CREATE USER art_hub_app WITH PASSWORD '<strong-password>';

-- Grant minimum required permissions
GRANT CONNECT ON DATABASE art_hub_db TO art_hub_app;
GRANT USAGE ON SCHEMA public TO art_hub_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO art_hub_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO art_hub_app;

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY user_isolation ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::uuid);
```

✅ **Connection Security**
```env
# Use SSL for database connection
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

✅ **Backup Strategy**
```bash
# Daily automated backups
0 2 * * * pg_dump art_hub_db | gzip > /backups/art_hub_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days of backups
find /backups -name "art_hub_*.sql.gz" -mtime +30 -delete
```

### Secure Headers

✅ **Helmet.js Configuration** (already implemented)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Configuration

✅ **Production CORS**
```javascript
app.use(cors({
  origin: [
    'https://arthubmilwaukee.com',
    'https://admin.arthubmilwaukee.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

### Rate Limiting Production Values

✅ **Adjust for Production Traffic**
```javascript
// More strict in production
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Reduced from 5
  skipSuccessfulRequests: true
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increased for legitimate traffic
  standardHeaders: true,
  legacyHeaders: false
});
```

---

## Security Monitoring

### Logging Strategy

✅ **Security Events to Log**
```javascript
// Winston logger configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Security logs
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    }),
    // All logs
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Log security events
logger.warn('Failed login attempt', {
  email: email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date()
});

logger.error('Account lockout', {
  userId: user.id,
  email: user.email,
  failedAttempts: 5,
  lockedUntil: lockoutTime
});
```

✅ **What to Log**
- All failed login attempts
- Account lockouts
- Password changes
- Token refresh failures
- Rate limit hits
- Suspicious IP access
- Admin actions
- Database errors
- API errors (500s)

✅ **What NOT to Log**
- Passwords (ever!)
- Full JWT tokens
- Refresh tokens
- Session tokens
- Credit card numbers
- Social security numbers
- Personal health information

### Monitoring Dashboards

✅ **Key Metrics to Track**
```sql
-- Failed logins in last hour
SELECT COUNT(*) FROM login_history 
WHERE success = false 
AND created_at > NOW() - INTERVAL '1 hour';

-- Locked accounts
SELECT COUNT(*) FROM users 
WHERE account_locked_until > NOW();

-- Active sessions per user (detect account sharing)
SELECT user_id, COUNT(*) 
FROM user_sessions 
WHERE is_active = true 
GROUP BY user_id 
HAVING COUNT(*) > 5;

-- Suspicious IPs (multiple accounts)
SELECT ip_address, COUNT(DISTINCT user_id) as user_count
FROM login_history 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address 
HAVING COUNT(DISTINCT user_id) > 10;
```

✅ **Alerting Thresholds**
- \>100 failed logins in 1 hour → Possible brute force attack
- \>50 account lockouts in 1 hour → DDoS or credential stuffing
- \>1000 API requests from single IP → Possible scraping/abuse
- Any SQL error → Possible injection attempt

### Security Scanning

✅ **Automated Scans**
```bash
# npm audit (run in CI/CD)
npm audit --production

# Check for known vulnerabilities
npm audit fix

# Snyk scanning
npx snyk test
npx snyk monitor

# OWASP Dependency Check
dependency-check --scan ./
```

✅ **Manual Penetration Testing**
- Quarterly professional pen tests
- Bug bounty program (consider HackerOne)
- Internal security reviews before major releases

---

## Code Security Practices

### Input Validation

✅ **Always Validate Input**
```javascript
// Bad - no validation
app.post('/api/user', (req, res) => {
  const user = req.body;
  db.query('INSERT INTO users ...', [user.email, user.name]);
});

// Good - validated
app.post('/api/user', (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(1).max(100).required(),
    age: Joi.number().integer().min(1).max(150)
  });
  
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  
  // Use validated data
  db.query('INSERT INTO users ...', [value.email, value.name]);
});
```

### SQL Injection Prevention

✅ **Always Use Parameterized Queries**
```javascript
// Bad - vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Good - parameterized
const query = 'SELECT * FROM users WHERE email = $1';
pool.query(query, [email]);
```

### XSS Prevention

✅ **Sanitize Output**
```javascript
const validator = require('validator');

// Escape HTML
const safeHtml = validator.escape(userInput);

// Validate URLs
if (!validator.isURL(url)) {
  throw new Error('Invalid URL');
}
```

✅ **Content Security Policy**
```javascript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // No inline scripts
    styleSrc: ["'self'", "'unsafe-inline'"], // Only allow inline styles if needed
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
}));
```

### CSRF Protection

✅ **For Cookie-Based Sessions**
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.post('/api/important-action', csrfProtection, (req, res) => {
  // Protected endpoint
});
```

**Note:** Using JWT in Authorization header (not cookies) = No CSRF vulnerability

### Password Security

✅ **Bcrypt Configuration**
```javascript
// Use 10+ rounds (already implemented)
const rounds = 10;
const hash = await bcrypt.hash(password, rounds);

// For extremely sensitive applications, consider 12+ rounds
const highSecurityRounds = 12;
```

✅ **Password Requirements**
```javascript
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  
  return {
    valid: password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  };
}
```

### Secret Management

✅ **Never Commit Secrets**
```bash
# .gitignore
.env
.env.local
.env.production
*.pem
*.key
secrets/
```

✅ **Use Secret Management Service**
```javascript
// AWS Secrets Manager
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({
    SecretId: secretName
  }).promise();
  
  return JSON.parse(data.SecretString);
}

// Use in application
const dbCreds = await getSecret('prod/art-hub/database');
```

✅ **Environment-Specific Secrets**
```bash
# Development
JWT_SECRET=dev-secret-not-for-production

# Production (from secret manager)
JWT_SECRET=<retrieved-from-aws-secrets-manager>
```

---

## Compliance & Privacy

### GDPR Compliance

✅ **User Data Rights**
```javascript
// Right to Access
app.get('/api/v1/users/me/data-export', auth, async (req, res) => {
  const userData = await getUserData(req.user.id);
  const sessions = await getSessions(req.user.id);
  const loginHistory = await getLoginHistory(req.user.id);
  
  res.json({
    user: userData,
    sessions: sessions,
    loginHistory: loginHistory,
    exportDate: new Date()
  });
});

// Right to Erasure
app.delete('/api/v1/users/me/delete-account', auth, async (req, res) => {
  // Anonymize or delete user data
  await anonymizeUser(req.user.id);
  res.json({ message: 'Account deleted successfully' });
});

// Right to Rectification
app.put('/api/v1/users/me', auth, async (req, res) => {
  // Allow users to update their data
  await updateUser(req.user.id, req.body);
  res.json({ message: 'Data updated successfully' });
});
```

✅ **Data Retention Policy**
```sql
-- Auto-delete old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Delete login history older than 90 days
  DELETE FROM login_history WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete inactive sessions older than 30 days
  DELETE FROM user_sessions WHERE expires_at < NOW();
  
  -- Delete revoked tokens older than 30 days
  DELETE FROM refresh_tokens WHERE revoked = true AND created_at < NOW() - INTERVAL '30 days';
  
  -- Delete acknowledged alerts older than 90 days
  DELETE FROM security_alerts WHERE acknowledged = true AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup
SELECT cron.schedule('cleanup-old-data', '0 3 * * *', 'SELECT cleanup_old_data()');
```

✅ **Cookie Consent**
```javascript
// Set secure cookie flags
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

✅ **Privacy Policy**
- Clearly state what data is collected
- Explain how data is used
- Provide contact for data requests
- Update policy when features change

### PCI DSS (if handling payments)

✅ **Never Store**
- Full credit card numbers
- CVV/CVC codes
- PIN numbers

✅ **Use Payment Processor**
```javascript
// Use Stripe - they handle PCI compliance
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  customer: stripeCustomerId,
  // Never see card details on your server
});
```

---

## Incident Response Plan

### Preparation

✅ **Security Contacts**
```
Security Lead: security@arthubmilwaukee.com
On-Call Developer: +1-XXX-XXX-XXXX
Hosting Provider: support@aws.com
Database Admin: dba@arthubmilwaukee.com
```

✅ **Incident Classification**
- **P0 - Critical**: Active data breach, full service outage
- **P1 - High**: Potential breach, major security vulnerability
- **P2 - Medium**: Minor vulnerability, limited impact
- **P3 - Low**: Security improvement, non-urgent issue

### Detection

✅ **Automated Alerts**
```javascript
// Email alert on suspicious activity
if (failedAttempts > 100) {
  sendEmail('security@arthubmilwaukee.com', 
    'Security Alert: Brute Force Detected',
    `${failedAttempts} failed login attempts in last hour from IP ${ip}`
  );
}
```

### Response Process

✅ **Immediate Actions (P0/P1)**
1. **Assess Impact**
   - What data was accessed?
   - How many users affected?
   - Is attack still ongoing?

2. **Contain**
   ```sql
   -- Lock all accounts
   UPDATE users SET account_locked_until = NOW() + INTERVAL '24 hours';
   
   -- Revoke all sessions
   UPDATE user_sessions SET is_active = false;
   
   -- Revoke all refresh tokens
   UPDATE refresh_tokens SET revoked = true;
   ```

3. **Investigate**
   ```sql
   -- Check login history
   SELECT * FROM login_history 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   
   -- Check suspicious IPs
   SELECT ip_address, COUNT(*) 
   FROM login_history 
   GROUP BY ip_address 
   HAVING COUNT(*) > 50;
   ```

4. **Eradicate**
   - Patch vulnerability
   - Deploy fix
   - Block malicious IPs
   ```sql
   INSERT INTO ip_blacklist (ip_address, reason)
   VALUES ('203.0.113.45', 'Brute force attack');
   ```

5. **Recover**
   - Restore from backup if needed
   - Unlock legitimate user accounts
   - Force password resets for affected users

6. **Communicate**
   - Notify affected users
   - Prepare public statement if required
   - Report to authorities if legally required

✅ **Post-Incident**
1. Document incident timeline
2. Root cause analysis
3. Implement preventive measures
4. Update security procedures
5. Train team on lessons learned

---

## Security Checklist for Deployments

### Pre-Deployment

- [ ] All dependencies updated
- [ ] npm audit shows no vulnerabilities
- [ ] Environment variables set correctly
- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials are strong
- [ ] HTTPS/SSL configured
- [ ] CORS allows only production domains
- [ ] Rate limits appropriate for traffic
- [ ] Logging configured and working
- [ ] Backup strategy in place
- [ ] Security headers enabled (Helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Secrets not in code or git
- [ ] Error messages don't leak info
- [ ] Admin endpoints require admin role
- [ ] File upload validation (if applicable)
- [ ] Email sending configured
- [ ] Security alerts configured

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Login flow works end-to-end
- [ ] Token refresh works
- [ ] Password reset works
- [ ] 2FA works (if enabled)
- [ ] Email notifications sent
- [ ] Rate limiting active
- [ ] Session management works
- [ ] Logout from all devices works
- [ ] Security alerts sent
- [ ] Logs being written
- [ ] Monitoring dashboards show data
- [ ] Automated backups running
- [ ] SSL certificate valid
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Load testing passed

---

## Regular Security Maintenance

### Weekly
- [ ] Review failed login reports
- [ ] Check for locked accounts
- [ ] Review rate limit hits
- [ ] Check for unusual IP patterns

### Monthly
- [ ] Run npm audit
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Review user permissions
- [ ] Check backup integrity
- [ ] Review API usage patterns

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update security policies
- [ ] Team security training
- [ ] Disaster recovery drill
- [ ] Review third-party integrations

### Annually
- [ ] Professional security assessment
- [ ] Update privacy policy
- [ ] Review compliance requirements
- [ ] Rotate encryption keys
- [ ] Update SSL certificates
- [ ] Review incident response plan

---

## Security Training for Team

### For Developers
- OWASP Top 10 vulnerabilities
- Secure coding practices
- Authentication vs Authorization
- Password hashing best practices
- SQL injection prevention
- XSS prevention
- CSRF protection
- Secure API design
- Git security (no secrets in commits)

### For Operations
- Server hardening
- Firewall configuration
- SSL/TLS setup
- Log analysis
- Incident response
- Backup and recovery
- Database security
- Monitoring setup

### For Everyone
- Phishing awareness
- Strong password practices
- 2FA usage
- Social engineering tactics
- Incident reporting process
- Data classification
- Privacy regulations basics

---

## Tools & Resources

### Security Tools
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Security testing platform
- **Snyk**: Dependency vulnerability scanning
- **npm audit**: Built-in dependency checker
- **SonarQube**: Code quality and security
- **Git-secrets**: Prevent committing secrets
- **Fail2Ban**: Intrusion prevention

### Monitoring Tools
- **Datadog**: Application monitoring
- **New Relic**: Performance monitoring
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Grafana**: Metrics visualization
- **Prometheus**: Metrics collection

### Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Remember: Security is not a one-time task, it's an ongoing process!**

Stay vigilant, keep learning, and regularly review and update your security measures.

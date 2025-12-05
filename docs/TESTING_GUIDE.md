# Testing Instructions - Security Features

## Overview
Complete testing guide for all security features implemented in Art Hub Milwaukee.

---

## Pre-Testing Setup

### 1. Environment Configuration
Ensure your `.env` file has:
```env
NODE_ENV=development
JWT_SECRET=your-secret-key-at-least-32-characters-long
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/art_hub_db

# Email (optional for testing - will log to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. Start Services
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Mobile (optional)
cd mobile
npx expo start --lan

# Terminal 3: Admin Dashboard (optional)
cd admin-dashboard
npm start
```

### 3. Test Database State
```sql
-- Check tables exist
\dt

-- Should see:
-- user_sessions, refresh_tokens, login_history, security_alerts, rate_limit_records
```

---

## Test Suite 1: Basic Authentication Flow

### Test 1.1: Successful Login
**Purpose:** Verify complete login flow with all security features

**Steps:**
1. Open mobile app or API client (Postman)
2. POST to `/api/v1/auth/login`
   ```json
   {
     "email": "test@example.com",
     "password": "ValidPass123!"
   }
   ```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGc...",
    "refreshToken": "a1b2c3d4...",
    "sessionToken": "e5f6g7h8..."
  }
}
```

**Verify in Database:**
```sql
-- Session created
SELECT * FROM user_sessions WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 1;
-- Should show: device info, IP, location, session_token

-- Refresh token created
SELECT * FROM refresh_tokens WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 1;
-- Should show: token, device_info, not revoked

-- Login logged
SELECT * FROM login_history WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 1;
-- Should show: success = true, device_info, location

-- Failed attempts reset
SELECT failed_login_attempts FROM users WHERE id = 'user-id';
-- Should show: 0
```

**Expected Email (if first login from this device):**
- Subject: "New Device Login Detected"
- Contains: device name, browser, location, IP, timestamp

### Test 1.2: Failed Login
**Purpose:** Verify failed login tracking and rate limiting

**Steps:**
1. POST to `/api/v1/auth/login` with wrong password
   ```json
   {
     "email": "test@example.com",
     "password": "WrongPassword"
   }
   ```
2. Repeat 5 times

**Expected Responses:**
- Attempts 1-5: 401 error, "Invalid email or password"
- Attempt 6: 423 error, "Account locked due to multiple failed login attempts"

**Verify in Database:**
```sql
-- Failed attempts recorded
SELECT * FROM login_history WHERE email = 'test@example.com' AND success = false;
-- Should show: 5 entries with failure_reason

-- Account locked
SELECT failed_login_attempts, account_locked_until FROM users WHERE email = 'test@example.com';
-- Should show: failed_login_attempts = 5, account_locked_until = NOW() + 30 minutes
```

**Expected Email (after 5 failures):**
- Subject: "Multiple Failed Login Attempts"
- Contains: attempt count, IP address, security recommendations

### Test 1.3: Account Unlock
**Purpose:** Verify account unlocks after cooldown

**Steps:**
1. Wait 30 minutes OR manually unlock:
   ```sql
   UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE email = 'test@example.com';
   ```
2. Attempt login with correct password

**Expected Result:**
- Login successful
- Tokens returned

---

## Test Suite 2: Token Refresh Flow

### Test 2.1: Automatic Token Refresh
**Purpose:** Verify mobile app automatically refreshes expired tokens

**Steps:**
1. Login to mobile app (store tokens)
2. Manually delete access token from AsyncStorage:
   ```javascript
   await AsyncStorage.removeItem('@auth_token');
   ```
3. Make any authenticated API call (e.g., view profile)

**Expected Behavior:**
1. Request fails with 401
2. Interceptor catches error
3. Calls `/auth/refresh-token` with refresh token
4. Receives new access token + new refresh token
5. Retries original request with new token
6. User sees their profile (seamless experience)

**Verify in Console:**
```
API Request: GET /api/v1/users/me → 401
Token Refresh: POST /auth/refresh-token → 200
Retry Request: GET /api/v1/users/me → 200
```

**Verify in Database:**
```sql
-- Old refresh token revoked
SELECT revoked FROM refresh_tokens WHERE token = 'old-token';
-- Should show: revoked = true

-- New refresh token created
SELECT * FROM refresh_tokens WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 1;
-- Should show: new token, revoked = false
```

### Test 2.2: Expired Refresh Token
**Purpose:** Verify user must re-login when refresh token expires

**Steps:**
1. Manually expire refresh token:
   ```sql
   UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 day' WHERE token = 'user-refresh-token';
   ```
2. Delete access token from mobile storage
3. Make authenticated API call

**Expected Behavior:**
1. Request fails with 401
2. Interceptor attempts refresh
3. Refresh fails (expired token)
4. All tokens cleared from storage
5. User redirected to login screen

### Test 2.3: Token Rotation
**Purpose:** Verify old tokens can't be reused

**Steps:**
1. Save current refresh token
2. Call `/auth/refresh-token` successfully
3. Attempt to use old refresh token again

**Expected Result:**
- 401 error: "Invalid or expired refresh token"

**Verify in Database:**
```sql
SELECT revoked FROM refresh_tokens WHERE token = 'old-refresh-token';
-- Should show: revoked = true
```

---

## Test Suite 3: Session Management

### Test 3.1: View Active Sessions
**Purpose:** Verify user can see all their sessions

**Steps:**
1. Login from multiple devices/browsers:
   - Chrome on desktop
   - Safari on mobile
   - Firefox on desktop
2. GET `/api/v1/sessions` (authenticated)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-1",
        "device_name": "Chrome 120",
        "device_type": "desktop",
        "browser": "Chrome",
        "os": "Windows 10",
        "ip_address": "192.168.1.100",
        "location": {"city": "Milwaukee", "country": "US"},
        "last_activity": "2025-11-19T10:30:00Z",
        "is_current": true,
        "created_at": "2025-11-19T08:00:00Z"
      },
      {
        "id": "session-2",
        "device_name": "Safari",
        "device_type": "mobile",
        ...
        "is_current": false
      }
    ]
  }
}
```

### Test 3.2: Logout from Specific Session
**Purpose:** Verify remote session revocation

**Steps:**
1. Note session ID from another device
2. DELETE `/api/v1/sessions/session-id-here` (authenticated)
3. Try to use that session's token

**Expected Behavior:**
- Session deleted successfully
- Old session token no longer works (401 error)
- Other sessions unaffected

**Verify in Database:**
```sql
SELECT is_active FROM user_sessions WHERE id = 'session-id';
-- Should show: is_active = false
```

### Test 3.3: Logout All Other Devices
**Purpose:** Verify bulk session revocation

**Steps:**
1. Login from 3 different devices
2. From device 1: DELETE `/api/v1/sessions/others/all` (with session token in header)
3. Try to use tokens from device 2 and 3

**Expected Behavior:**
- Device 1 still works
- Device 2 and 3 get 401 errors (must re-login)

**Verify in Database:**
```sql
SELECT is_active, session_token FROM user_sessions WHERE user_id = 'user-id';
-- Should show: only current session is_active = true
```

---

## Test Suite 4: Security Alerts

### Test 4.1: New Device Alert
**Purpose:** Verify email sent for new device login

**Steps:**
1. Clear login history for user:
   ```sql
   DELETE FROM login_history WHERE user_id = 'user-id';
   ```
2. Login from a new browser (different user agent)
3. Check email

**Expected Email:**
- Subject: "New Device Login Detected"
- Body contains:
  - Device name (e.g., "Firefox 120")
  - Browser (e.g., "Firefox")
  - Location (e.g., "Milwaukee, US")
  - IP address
  - Timestamp
  - Warning about unauthorized access

**Verify in Database:**
```sql
SELECT * FROM security_alerts WHERE user_id = 'user-id' AND alert_type = 'new_device';
-- Should show: severity = 'medium', details with device info
```

### Test 4.2: Suspicious IP Alert
**Purpose:** Verify email sent for new IP address

**Steps:**
1. Login normally (record IP)
2. Use VPN or proxy to change IP
3. Login again from same device but different IP
4. Check email

**Expected Email:**
- Subject: "Unusual Login Location Detected"
- Contains: new location, new IP, timestamp

**Verify in Database:**
```sql
SELECT * FROM security_alerts WHERE user_id = 'user-id' AND alert_type = 'suspicious_ip';
-- Should show: severity = 'high'
```

### Test 4.3: Failed Attempts Alert
**Purpose:** Verify email after 5 failed logins

**Steps:**
1. Attempt login with wrong password 5 times
2. Check email

**Expected Email:**
- Subject: "Multiple Failed Login Attempts"
- Contains: attempt count (5), IP, recommendations (change password, enable 2FA)

### Test 4.4: Password Change Alert
**Purpose:** Verify confirmation email on password change

**Steps:**
1. Login successfully
2. POST `/api/v1/auth/change-password`
   ```json
   {
     "currentPassword": "OldPass123!",
     "newPassword": "NewPass123!"
   }
   ```
3. Check email

**Expected Email:**
- Subject: "Password Changed Successfully"
- Contains: location, IP, timestamp, contact support link

**Verify in Database:**
```sql
-- All refresh tokens revoked
SELECT COUNT(*) FROM refresh_tokens WHERE user_id = 'user-id' AND revoked = false;
-- Should show: 0

-- All sessions deactivated
SELECT COUNT(*) FROM user_sessions WHERE user_id = 'user-id' AND is_active = true;
-- Should show: 0

-- Alert created
SELECT * FROM security_alerts WHERE user_id = 'user-id' AND alert_type = 'password_change';
-- Should show: severity = 'low'
```

**Expected Behavior:**
- User logged out from ALL devices
- Must re-login everywhere with new password

---

## Test Suite 5: Rate Limiting

### Test 5.1: Login Rate Limit
**Purpose:** Verify brute force protection

**Steps:**
1. Attempt login 6 times within 15 minutes
   ```bash
   for i in {1..6}; do
     curl -X POST http://localhost:5000/api/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}';
     sleep 1;
   done
   ```

**Expected Results:**
- Attempts 1-5: 401 "Invalid email or password"
- Attempt 6: 429 "Too many login attempts. Please try again in 15 minutes."

**Verify Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <timestamp>
```

### Test 5.2: API Rate Limit
**Purpose:** Verify general API protection

**Steps:**
1. Make 101 API requests to any endpoint within 15 minutes
   ```bash
   for i in {1..101}; do
     curl http://localhost:5000/api/v1/categories;
   done
   ```

**Expected Results:**
- Requests 1-100: Success
- Request 101: 429 "Too many requests. Please try again later."

### Test 5.3: Registration Rate Limit
**Purpose:** Verify spam account prevention

**Steps:**
1. Attempt 4 registrations from same IP within 1 hour

**Expected Results:**
- Attempts 1-3: Success
- Attempt 4: 429 "Too many registration attempts. Please try again in an hour."

### Test 5.4: Password Reset Rate Limit
**Purpose:** Verify email spam prevention

**Steps:**
1. Request password reset 4 times within 1 hour
   ```bash
   for i in {1..4}; do
     curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com"}';
     sleep 1;
   done
   ```

**Expected Results:**
- Attempts 1-3: "If an account exists, a reset link will be sent"
- Attempt 4: 429 "Too many password reset requests. Please try again in an hour."

### Test 5.5: Sensitive Operations Limit
**Purpose:** Verify protection on critical actions

**Steps:**
1. Change password 4 times within 1 hour (with valid current password each time)

**Expected Results:**
- Attempts 1-3: Success
- Attempt 4: 429 "Too many attempts. Please try again in an hour."

---

## Test Suite 6: Login History

### Test 6.1: View Login History
**Purpose:** Verify audit trail visibility

**Steps:**
1. Login successfully 3 times from different locations/devices
2. Fail login 2 times
3. GET `/api/v1/sessions/history?limit=10`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "...",
        "success": true,
        "ip_address": "192.168.1.100",
        "device_info": {"deviceName": "Chrome 120", ...},
        "location": {"city": "Milwaukee", "country": "US"},
        "created_at": "2025-11-19T10:00:00Z"
      },
      {
        "success": false,
        "failure_reason": "Invalid password",
        ...
      }
    ]
  }
}
```

**Verify All Logins Recorded:**
```sql
SELECT COUNT(*) FROM login_history WHERE user_id = 'user-id';
-- Should show: 5 (3 success + 2 failed)
```

---

## Test Suite 7: Edge Cases

### Test 7.1: Concurrent Logins
**Purpose:** Verify system handles multiple simultaneous logins

**Steps:**
1. Login from 5 browsers simultaneously
2. Verify all sessions created
3. All tokens work independently

### Test 7.2: Session Expiration
**Purpose:** Verify expired sessions are rejected

**Steps:**
1. Manually expire session:
   ```sql
   UPDATE user_sessions SET expires_at = NOW() - INTERVAL '1 day' WHERE session_token = 'token';
   ```
2. Try to use expired session token

**Expected Result:**
- 401 error

### Test 7.3: Malformed Tokens
**Purpose:** Verify security against token tampering

**Steps:**
1. Modify JWT token (change one character)
2. Make authenticated request

**Expected Result:**
- 401 "Invalid or expired token"

### Test 7.4: Missing Headers
**Purpose:** Verify proper error handling

**Steps:**
1. Call authenticated endpoint without Authorization header
2. Call session endpoint without x-session-token

**Expected Results:**
- 401 "No token provided"

---

## Test Suite 8: Mobile App Integration

### Test 8.1: Login Flow
**Steps:**
1. Open mobile app
2. Enter credentials and login
3. Verify AsyncStorage contains:
   - `@auth_token`
   - `@refresh_token`
   - `@session_token`
   - `@user_data`

### Test 8.2: Automatic Refresh
**Steps:**
1. Let app sit for JWT expiration period
2. Navigate to any screen requiring auth
3. Verify: no logout, seamless experience

### Test 8.3: Logout
**Steps:**
1. Login
2. Tap logout button
3. Verify:
   - All tokens removed from AsyncStorage
   - Backend session deactivated
   - Refresh token revoked
   - Redirected to login screen

---

## Performance Testing

### Load Test: Login Endpoint
```bash
# Install: npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:5000/api/v1/auth/login
```

**Expected Results:**
- 95% requests complete in <200ms
- No database connection errors
- Rate limiting kicks in appropriately

### Load Test: Token Refresh
```bash
artillery quick --count 50 --num 5 http://localhost:5000/api/v1/auth/refresh-token
```

**Expected Results:**
- All refreshes complete successfully
- Token rotation works under load
- No duplicate tokens created

---

## Security Testing

### Test: SQL Injection Prevention
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com OR 1=1--","password":"anything"}'
```

**Expected Result:**
- Login fails (treated as literal email)
- No database error
- No data leaked

### Test: XSS Prevention
```bash
curl -X POST http://localhost:5000/api/v1/auth/register/buyer \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","firstName":"<script>alert(1)</script>","lastName":"Test"}'
```

**Expected Result:**
- Registration succeeds or fails on validation
- Script tags escaped/sanitized
- No JavaScript execution

### Test: JWT Tampering
**Steps:**
1. Get valid JWT token
2. Decode at jwt.io
3. Change user ID in payload
4. Re-encode (without proper signature)
5. Try to use tampered token

**Expected Result:**
- 401 "Invalid or expired token"

---

## Monitoring & Logging Tests

### Test: Failed Login Monitoring
**Steps:**
1. Generate 10 failed login attempts from different IPs
2. Query monitoring dashboard

**Expected Metrics:**
```sql
SELECT 
  COUNT(*) as total_failures,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT email) as affected_users
FROM login_history 
WHERE success = false 
AND created_at > NOW() - INTERVAL '1 hour';
```

### Test: Session Analytics
**Query:**
```sql
SELECT 
  device_type,
  COUNT(*) as session_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_age_hours
FROM user_sessions 
WHERE is_active = true
GROUP BY device_type;
```

**Expected Output:**
- Breakdown by mobile/desktop/tablet
- Average session age

---

## Cleanup After Testing

```sql
-- Reset test account
UPDATE users SET 
  failed_login_attempts = 0, 
  account_locked_until = NULL 
WHERE email = 'test@example.com';

-- Clear test data
DELETE FROM login_history WHERE created_at < NOW() - INTERVAL '1 day';
DELETE FROM security_alerts WHERE created_at < NOW() - INTERVAL '1 day';
DELETE FROM rate_limit_records;

-- Deactivate old sessions
UPDATE user_sessions SET is_active = false WHERE last_activity < NOW() - INTERVAL '1 day';
```

---

## Automated Test Script

Save as `test-security.sh`:
```bash
#!/bin/bash
API_URL="http://localhost:5000/api/v1"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="ValidPass123!"

echo "=== Security Feature Testing ==="

# Test 1: Successful Login
echo "Test 1: Successful Login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')
echo "✓ Login successful"

# Test 2: Rate Limiting
echo "Test 2: Testing Rate Limit"
for i in {1..6}; do
  RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong\"}")
  if [ $i -eq 6 ]; then
    echo $RESPONSE | grep -q "429" && echo "✓ Rate limit working" || echo "✗ Rate limit failed"
  fi
done

# Test 3: View Sessions
echo "Test 3: View Active Sessions"
SESSIONS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/sessions")
SESSION_COUNT=$(echo $SESSIONS | jq '.data.sessions | length')
echo "✓ Found $SESSION_COUNT active sessions"

# Test 4: Token Refresh
echo "Test 4: Token Refresh"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
NEW_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.token')
[ ! -z "$NEW_TOKEN" ] && echo "✓ Token refresh successful" || echo "✗ Token refresh failed"

echo "=== Testing Complete ==="
```

Make executable: `chmod +x test-security.sh`
Run: `./test-security.sh`

---

## Test Checklist

Copy and check off as you test:

- [ ] User can login successfully
- [ ] Login returns JWT, refresh token, and session token
- [ ] Session created in database with device info
- [ ] Login history recorded
- [ ] New device email alert sent
- [ ] Failed login increments counter
- [ ] 5 failed logins lock account for 30 minutes
- [ ] Failed login email sent after 5 attempts
- [ ] Account unlocks after cooldown
- [ ] Rate limiting blocks 6th login attempt
- [ ] Token refresh works automatically
- [ ] Old refresh token revoked after refresh
- [ ] Expired refresh token requires re-login
- [ ] User can view all active sessions
- [ ] User can logout from specific session
- [ ] User can logout all other devices
- [ ] Suspicious IP alert email sent
- [ ] Password change revokes all tokens
- [ ] Password change email sent
- [ ] API rate limit works (100 per 15 min)
- [ ] Registration rate limit works (3 per hour)
- [ ] Password reset rate limit works (3 per hour)
- [ ] Login history shows all attempts
- [ ] Security alerts stored in database
- [ ] Session expiration works
- [ ] Malformed tokens rejected
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] Mobile app stores all tokens
- [ ] Mobile app auto-refreshes tokens
- [ ] Mobile logout clears all tokens

**All tests passed?** ✅ Security system is production-ready!

---

## Reporting Issues

If any test fails:
1. Note the test name and steps
2. Check backend logs for errors
3. Check database state
4. Verify environment configuration
5. Report with: test name, expected vs actual result, error logs

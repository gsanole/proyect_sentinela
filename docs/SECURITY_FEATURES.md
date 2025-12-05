# Security Features Implementation Guide

## ✅ Implemented Security Features

### 1. Email Verification
- **Required on signup** - All new accounts must verify email before logging in
- **24-hour token expiration** - Verification links expire after 24 hours
- **Resend capability** - Users can request new verification emails
- **Secure token generation** - Cryptographically secure random tokens

### 2. Two-Factor Authentication (2FA)
- **Email-based OTP** - 6-digit codes sent to verified email
- **10-minute code expiration** - Time-limited verification codes
- **Backup codes** - 8 one-time backup codes for account recovery
- **Optional** - Users can enable/disable 2FA in their settings

### 3. Role-Based Access Control (RBAC)
- **Three roles**: `buyer`, `artist`, `admin`
- **Middleware protection** - Routes protected by role requirements
- **Email verification check** - Certain routes require verified email
- **Artist approval** - Artists must be approved before listing art

## Usage Examples

### Email Verification Flow

**1. User registers:**
```javascript
POST /api/v1/auth/register/buyer
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "success": true,
  "data": {
    "user": { ...user data... },
    "message": "Please check your email to verify your account",
    "requiresEmailVerification": true
  }
}
// No token provided yet - must verify email first
```

**2. User checks email and clicks link:**
```
https://yourapp.com/verify-email?token=abc123...
```

**3. Frontend calls verify endpoint:**
```javascript
POST /api/v1/auth/verify-email
{
  "token": "abc123..."
}

Response:
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": { ...user data..., "email_verified": true },
    "token": "jwt_token_here"  // Now they get the JWT
  }
}
```

**4. Resend verification if needed:**
```javascript
POST /api/v1/auth/resend-verification
{
  "email": "user@example.com"
}
```

### 2FA Flow

**1. Enable 2FA (requires authenticated user):**
```javascript
POST /api/v1/auth/2fa/enable
Headers: { "Authorization": "Bearer jwt_token" }

Response:
{
  "success": true,
  "message": "2FA enabled successfully. Save your backup codes in a safe place.",
  "data": {
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      // ... 6 more codes
    ]
  }
}
// Save these backup codes! They can be used if email is unavailable
```

**2. Login with 2FA enabled:**
```javascript
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "requires2FA": true,
    "userId": "user-uuid-here",
    "message": "Please enter the verification code sent to your email"
  }
}
// Check email for 6-digit code
```

**3. Verify 2FA code:**
```javascript
POST /api/v1/auth/verify-2fa
{
  "userId": "user-uuid-here",
  "code": "123456"  // 6-digit code from email
}

Response:
{
  "success": true,
  "data": {
    "user": { ...user data... },
    "token": "jwt_token_here"
  }
}
```

**4. Use backup code (if email unavailable):**
```javascript
POST /api/v1/auth/verify-2fa
{
  "userId": "user-uuid-here",
  "code": "A1B2C3D4",  // One of the backup codes
  "useBackupCode": true
}
```

**5. Disable 2FA:**
```javascript
POST /api/v1/auth/2fa/disable
Headers: { "Authorization": "Bearer jwt_token" }
{
  "password": "SecurePass123!"  // Require password confirmation
}
```

**6. Check 2FA status:**
```javascript
GET /api/v1/auth/2fa/status
Headers: { "Authorization": "Bearer jwt_token" }

Response:
{
  "success": true,
  "data": { "enabled": true }
}
```

### Role-Based Access Control

**Protect routes by role:**
```javascript
const { requireRole, requireEmailVerified, requireArtistApproved } = require('../middleware/rbac');

// Only admins can access
router.post('/admin/invite-codes', 
  authenticate, 
  requireRole('admin'), 
  createInviteCode
);

// Only artists can access
router.post('/art-pieces', 
  authenticate, 
  requireRole('artist'),
  requireEmailVerified,  // Must verify email
  requireArtistApproved,  // Must be approved by admin
  uploadArtPiece
);

// Artists and admins can access
router.get('/analytics', 
  authenticate, 
  requireRole('artist', 'admin'), 
  getAnalytics
);

// Multiple middleware: role + email verification
router.post('/cart/checkout', 
  authenticate,
  requireRole('buyer'),
  requireEmailVerified,
  checkout
);
```

**Middleware responses:**

Email not verified:
```json
{
  "success": false,
  "error": {
    "message": "Email verification required. Please check your email and verify your account.",
    "requiresEmailVerification": true
  }
}
```

Wrong role:
```json
{
  "success": false,
  "error": {
    "message": "Access denied. Insufficient permissions.",
    "requiredRole": ["admin"],
    "currentRole": "buyer"
  }
}
```

Artist not approved:
```json
{
  "success": false,
  "error": {
    "message": "Your artist account is pending approval. You will be notified once approved.",
    "approvalStatus": "pending"
  }
}
```

## Database Schema Updates

**Users table - added columns:**
```sql
email_verified BOOLEAN DEFAULT false,
two_factor_enabled BOOLEAN DEFAULT false,
two_factor_secret VARCHAR(255),
```

**New tables:**
- `email_verification_tokens` - Store email verification tokens
- `two_factor_codes` - Store temporary OTP codes (10 min expiry)
- `two_factor_backup_codes` - Store hashed backup codes

## API Endpoints Summary

### Email Verification
- `POST /api/v1/auth/verify-email` - Verify email with token
- `POST /api/v1/auth/resend-verification` - Resend verification email

### 2FA Management
- `POST /api/v1/auth/verify-2fa` - Verify 2FA code during login
- `POST /api/v1/auth/2fa/enable` - Enable 2FA (authenticated)
- `POST /api/v1/auth/2fa/disable` - Disable 2FA (authenticated)
- `GET /api/v1/auth/2fa/status` - Check if 2FA is enabled

## Setup Instructions

### 1. Run Updated Migrations

```powershell
# This will create the new tables
node migrations/run-migrations.js
```

### 2. Update Frontend URLs

In `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

This is used for email verification links.

### 3. Test Email Verification

```powershell
# Register user
$body = @{
    email = "test@example.com"
    password = "Test123!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register/buyer" `
  -Method Post -Body $body -ContentType "application/json"

# Check console for verification link (in dev mode)
# Copy the token from the link and verify:

$verifyBody = @{ token = "TOKEN_FROM_EMAIL" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/verify-email" `
  -Method Post -Body $verifyBody -ContentType "application/json"
```

## Security Best Practices

✅ **Email verification required** - Prevents fake account creation  
✅ **2FA optional but recommended** - Extra layer of security  
✅ **Role-based access** - Users can only access appropriate features  
✅ **Password confirmation for 2FA disable** - Prevents unauthorized changes  
✅ **Backup codes** - Account recovery if email is compromised  
✅ **Token expiration** - Limited-time verification links and OTP codes  
✅ **Hashed backup codes** - Even if database is compromised, codes are safe

## Mobile App Integration

Update mobile app to handle:

1. **Registration response** - Show "Check your email" message
2. **Email verification** - Deep link handling for verification URLs
3. **Login with 2FA** - Show OTP input screen if `requires2FA: true`
4. **Settings screen** - Allow users to enable/disable 2FA

## Admin Dashboard Integration

Admin should be able to:

1. **View user verification status** - See which users have verified emails
2. **Resend verification emails** - Help users who didn't receive email
3. **Reset 2FA** - Disable 2FA for users who lost access
4. **Approve artists** - Required before artists can list art

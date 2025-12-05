# Authentication System Setup Guide

## What We Just Built

The authentication system is now **fully functional** with the following features:

### ✅ Implemented Features

1. **User Registration**
   - Buyer registration with email/password
   - Artist registration with invite code validation
   - Password strength validation (min 8 chars, uppercase, lowercase, number)
   - Email format validation
   - Duplicate email prevention

2. **Login System**
   - Email/password authentication
   - JWT token generation (7-day expiration)
   - Last login tracking
   - Account status checking

3. **Password Management**
   - Forgot password (email reset link)
   - Reset password with token validation
   - Change password (authenticated users)
   - Secure password hashing with bcrypt

4. **Security**
   - JWT-based authentication
   - Role-based access control (buyer, artist, admin)
   - Password hashing with bcrypt (10 salt rounds)
   - Input validation and sanitization
   - XSS prevention
   - SQL injection prevention

5. **Email Notifications**
   - Welcome emails for buyers
   - Artist application confirmation emails
   - Password reset emails
   - Configurable SMTP or console logging for development

## Files Created

### Core Services
- `backend/src/services/auth.service.js` - Authentication business logic (380 lines)
- `backend/src/utils/email.js` - Email sending utility
- `backend/src/utils/validation.js` - Input validation helpers

### Routes
- `backend/src/routes/auth.routes.js` - Fully implemented auth endpoints

### Database
- `backend/migrations/001_initial_schema.sql` - Complete database schema
- `backend/migrations/run-migrations.js` - Migration runner script

### Configuration
- `backend/.env.example` - Updated with all required environment variables
- `backend/scripts/generate-admin-password.js` - Admin password hash generator

## How to Run the Backend

### 1. Install Dependencies

```powershell
cd backend
npm install
```

### 2. Setup Environment Variables

```powershell
# Copy the example env file
cp .env.example .env

# Edit .env and set your values
notepad .env
```

Required values to update:
- `DB_PASSWORD` - Your PostgreSQL password
- `JWT_SECRET` - Generate a strong random string (min 32 chars)
- Other services (AWS, Stripe) can be configured later

### 3. Create Database

```powershell
# Connect to PostgreSQL and create database
psql -U postgres
```

```sql
CREATE DATABASE art_hub_db;
CREATE DATABASE art_hub_test_db;
\q
```

### 4. Generate Admin Password Hash

```powershell
node scripts/generate-admin-password.js
```

Copy the hash output and paste it into `migrations/001_initial_schema.sql` replacing `$2a$10$YourHashedPasswordHere`.

### 5. Run Migrations

```powershell
node migrations/run-migrations.js
```

You should see:
```
🚀 Running database migrations...
✅ Migrations completed successfully!

Created tables:
  - users
  - artist_profiles
  - invite_codes
  ... (14 tables total)

Default data inserted:
  - 6 art categories
  - Admin user (email: admin@arthubmke.com)
```

### 6. Start the Server

```powershell
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

Server will start on http://localhost:5000

## Testing the Authentication API

### 1. Register a Buyer

```powershell
# Using curl (if installed)
curl -X POST http://localhost:5000/api/v1/auth/register/buyer `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"buyer@test.com\",
    \"password\": \"Test123!\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\",
    \"phone\": \"4141234567\"
  }'
```

Or use PowerShell's Invoke-RestMethod:

```powershell
$body = @{
    email = "buyer@test.com"
    password = "Test123!"
    firstName = "John"
    lastName = "Doe"
    phone = "4141234567"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register/buyer" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "buyer@test.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "4141234567",
      "role": "buyer",
      "created_at": "2025-11-17T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

```powershell
$body = @{
    email = "buyer@test.com"
    password = "Test123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### 3. Create Invite Code (Admin Only)

First, you'll need to implement the admin routes to create invite codes. For now, insert directly:

```sql
INSERT INTO invite_codes (code, created_by, expires_at)
VALUES ('ARTIST2025', (SELECT id FROM users WHERE role = 'admin' LIMIT 1), NOW() + INTERVAL '30 days');
```

### 4. Register an Artist

```powershell
$body = @{
    email = "artist@test.com"
    password = "Artist123!"
    firstName = "Jane"
    lastName = "Smith"
    inviteCode = "ARTIST2025"
    bio = "Milwaukee-based painter specializing in landscapes"
    portfolioUrl = "https://janesmith.art"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register/artist" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

## API Endpoints Reference

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/buyer` | Register as buyer |
| POST | `/api/v1/auth/register/artist` | Register as artist (requires invite code) |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| POST | `/api/v1/auth/forgot-password` | Request password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |

### Protected Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/logout` | Logout (token cleanup) |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| POST | `/api/v1/auth/change-password` | Change password |

### Using Protected Endpoints

Include the JWT token in the Authorization header:

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_JWT_TOKEN_HERE"
    "Content-Type" = "application/json"
}

$body = @{
    currentPassword = "Test123!"
    newPassword = "NewPass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/change-password" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

## Running Tests

```powershell
# Run all tests
npm test

# Run auth-specific tests
npm run test:unit -- __tests__/unit/utils/auth.test.js
npm run test:integration -- __tests__/integration/api/auth.test.js
npm run test:security

# Watch mode for development
npm run test:watch
```

## Email Configuration

### Development Mode
By default, emails are logged to the console. No SMTP setup required!

### Production Mode
Update `.env` with your SMTP credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=Art Hub Milwaukee <noreply@arthubmke.com>
```

For Gmail, create an [App Password](https://myaccount.google.com/apppasswords).

## Next Steps

Now that authentication is working, you can:

1. **Test the API** - Use the commands above to create accounts and login
2. **Create Admin Routes** - Implement invite code generation and artist approval
3. **Build Art Listing Features** - Allow artists to upload artwork
4. **Implement Cart & Checkout** - Add shopping cart and Stripe integration
5. **Connect Mobile App** - Update API base URL in mobile app

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `Get-Service postgresql*`
- Check database credentials in `.env`
- Ensure database exists: `psql -U postgres -l`

### Migration Fails
- Check PostgreSQL version: `psql --version` (need 14+)
- Verify UUID extension: `psql -U postgres -d art_hub_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"`
- Drop and recreate database if needed

### JWT Token Error
- Ensure `JWT_SECRET` in `.env` is at least 32 characters
- Check token expiration (default 7 days)

### Email Not Sending
- In development, emails are logged to console - this is expected
- For production, verify SMTP credentials
- Check firewall/port 587 is open

## Security Checklist

- [x] Passwords hashed with bcrypt (10 rounds)
- [x] JWT tokens with expiration
- [x] Email validation
- [x] Password strength requirements
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (input sanitization)
- [x] Rate limiting configured
- [x] CORS configured
- [x] Helmet security headers
- [ ] Change default admin password
- [ ] Use strong JWT_SECRET in production
- [ ] Enable HTTPS in production
- [ ] Set up proper SMTP for production emails

## Success! 🎉

Your authentication system is fully functional. You can now register users, login, and manage passwords. The foundation is set for building out the rest of the Art Hub marketplace!

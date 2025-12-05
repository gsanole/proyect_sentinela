# End-to-End Testing Guide

## Testing the Complete Flow

This guide walks you through testing the entire application from backend to mobile app.

## Prerequisites

Make sure you have:
- PostgreSQL running
- Node.js installed
- React Native development environment set up (for mobile testing)

## Step 1: Start the Backend

```powershell
# Navigate to backend
cd backend

# Run the automated setup script
.\start.ps1
```

The script will:
1. ✅ Check Node.js and PostgreSQL
2. ✅ Install dependencies
3. ✅ Create .env file (edit with your settings)
4. ✅ Create database
5. ✅ Run migrations
6. ✅ Start server on http://localhost:5000

## Step 2: Test Backend API

### Test Health Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T..."
}
```

### Test User Registration

```powershell
$buyerData = @{
    email = "john@test.com"
    password = "Test123!"
    firstName = "John"
    lastName = "Doe"
    phone = "4141234567"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register/buyer" `
  -Method Post `
  -Body $buyerData `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

Expected: User created, email verification required

### Check Console for Verification Link

Look in the backend console for:
```
📧 Email would be sent:
   To: john@test.com
   Subject: Verify Your Email - Art Hub Milwaukee
   ...verify-email?token=abc123...
```

### Verify Email

```powershell
$token = "COPY_TOKEN_FROM_CONSOLE"
$verifyData = @{ token = $token } | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/verify-email" `
  -Method Post `
  -Body $verifyData `
  -ContentType "application/json"

$jwtToken = $response.data.token
Write-Host "JWT Token: $jwtToken"
```

### Test Login

```powershell
$loginData = @{
    email = "john@test.com"
    password = "Test123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method Post `
  -Body $loginData `
  -ContentType "application/json"

$jwtToken = $response.data.token
Write-Host "Login successful! Token: $jwtToken"
```

### Test Protected Endpoint

```powershell
$headers = @{
    "Authorization" = "Bearer $jwtToken"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/me" `
  -Headers $headers
```

## Step 3: Test Mobile App Connection

### Start Metro Bundler

```powershell
cd ../mobile
npm install
npx react-native start
```

### Run on iOS

```powershell
# In a new terminal
cd mobile
npx react-native run-ios
```

### Run on Android

```powershell
# In a new terminal
cd mobile
npx react-native run-android
```

### Test Mobile Registration

1. Open the app
2. Tap "Register"
3. Fill in the form:
   - Email: testuser@example.com
   - Password: Test123!
   - First Name: Test
   - Last Name: User
4. Tap "Register"
5. Should see "Check your email" message
6. Check backend console for verification link
7. Copy token and verify via API (or implement deep linking)

### Test Mobile Login

1. After email verification, go to Login
2. Enter credentials
3. Should see successful login and navigate to Home

## Step 4: Test Admin Dashboard

### Start Admin Dashboard

```powershell
cd ../admin-dashboard
npm install
npm start
```

Dashboard opens at http://localhost:3000

### Login as Admin

Use credentials:
- Email: admin@arthubmke.com
- Password: Admin123!

### Test Admin Features

1. **Dashboard** - Should show stats
2. **Artists** - View pending artist approvals
3. **Art Pieces** - View pending artwork approvals
4. **Invite Codes** - Create new invite codes
5. **Orders** - View all orders

## Step 5: Test Complete User Flow

### As a Buyer

1. **Register** → Verify email → Login
2. **Browse** art feed
3. **Search** for art
4. **Favorite** an art piece
5. **Add to cart**
6. **Checkout** (requires Stripe setup)

### As an Artist

1. **Get invite code** from admin
2. **Register as artist** with code
3. **Verify email** → Login
4. **Wait for admin approval**
5. **Upload artwork** (after approval)
6. **Promote listing** (optional, requires payment)

### As an Admin

1. **Login** to dashboard
2. **Approve artist** accounts
3. **Review and approve** artwork submissions
4. **Generate invite codes**
5. **Process payouts**
6. **View analytics**

## Step 6: Test 2FA Flow

### Enable 2FA

```powershell
$headers = @{
    "Authorization" = "Bearer $jwtToken"
}

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/2fa/enable" `
  -Method Post `
  -Headers $headers

Write-Host "Backup Codes:"
$response.data.backupCodes
```

**IMPORTANT**: Save these backup codes!

### Test Login with 2FA

```powershell
# Login will now require 2FA
$loginData = @{
    email = "john@test.com"
    password = "Test123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method Post `
  -Body $loginData `
  -ContentType "application/json"

# Should get requires2FA response
$userId = $response.data.userId
Write-Host "Check email for OTP code"
```

Check console for 6-digit code, then:

```powershell
$verify2FAData = @{
    userId = $userId
    code = "123456"  # Replace with code from email
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/verify-2fa" `
  -Method Post `
  -Body $verify2FAData `
  -ContentType "application/json"

$jwtToken = $response.data.token
Write-Host "2FA Login successful!"
```

## Common Issues & Solutions

### Backend won't start
- Check PostgreSQL is running: `Get-Service postgresql*`
- Verify .env file has correct database credentials
- Check port 5000 is not in use

### Database errors
- Drop and recreate database: `psql -U postgres -c "DROP DATABASE art_hub_db; CREATE DATABASE art_hub_db;"`
- Run migrations again: `node migrations/run-migrations.js`

### Mobile app can't connect
- **iOS**: Use `localhost:5000`
- **Android Emulator**: Use `10.0.2.2:5000`
- **Physical Device**: Use your computer's IP address
- Ensure backend is running and accessible

### Admin dashboard can't connect
- Check API URL in `.env` or `api.js`
- Verify CORS is enabled in backend
- Check browser console for errors

### Token errors
- Token may have expired (7 days)
- Try logging in again
- Check JWT_SECRET is set in backend .env

### Email verification not working
- Check backend console for verification links
- In development, emails are logged to console
- Copy token from console output

## Success Criteria

✅ Backend server running on port 5000  
✅ Health endpoint returns OK  
✅ User can register and verify email  
✅ User can login and receive JWT  
✅ Protected endpoints work with token  
✅ Mobile app connects to backend  
✅ Admin dashboard connects to backend  
✅ 2FA flow works correctly  
✅ Role-based access control enforced  

## Next Steps

Once everything is working:

1. **Configure Stripe** for real payments
2. **Set up AWS S3** for image uploads
3. **Configure SMTP** for production emails
4. **Deploy backend** to cloud (AWS, Heroku, etc.)
5. **Build mobile apps** for iOS and Android
6. **Deploy admin dashboard** to hosting service
7. **Set up CI/CD** pipeline
8. **Add monitoring** and error tracking

## Need Help?

Check the documentation:
- `docs/AUTH_SETUP_GUIDE.md` - Backend setup
- `docs/SECURITY_FEATURES.md` - 2FA and email verification
- `docs/API_ENDPOINTS.md` - Full API reference
- `QUICKSTART.md` - Quick start guide

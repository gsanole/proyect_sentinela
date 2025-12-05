# Quick Start Guide

## Prerequisites Checklist

Before you begin development, ensure you have:

### Required Software
- [ ] **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- [ ] **npm** or **yarn** - Comes with Node.js
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)

### For Mobile Development
- [ ] **React Native CLI** - `npm install -g react-native-cli`
- [ ] **Xcode** (macOS only, for iOS) - [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
- [ ] **Android Studio** (for Android) - [Download](https://developer.android.com/studio)
- [ ] **CocoaPods** (macOS only) - `sudo gem install cocoapods`

### Cloud Services Accounts
- [ ] **AWS Account** - [Sign up](https://aws.amazon.com/)
  - Create IAM user with S3 access
  - Create S3 bucket for images
  - Note: Access Key ID and Secret Access Key
- [ ] **Stripe Account** - [Sign up](https://stripe.com/)
  - Get test API keys (Secret & Publishable)
  - Set up Stripe Connect for marketplace
  - Note: Webhook secret for local testing

---

## Step-by-Step Setup

### 1. Database Setup (PostgreSQL)

**Create database:**
```sql
CREATE DATABASE art_hub_db;
CREATE USER art_hub_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE art_hub_db TO art_hub_user;
```

**Enable UUID extension:**
```sql
\c art_hub_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your credentials
# Update these values:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
# - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
# - JWT_SECRET (generate a random secure string)

# Run database migrations
npm run migrate

# (Optional) Seed database with sample data
npm run seed

# Start development server
npm run dev
```

Backend should now be running on `http://localhost:5000`

**Test it:**
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"...","environment":"development"}
```

### 3. Admin Dashboard Setup

```bash
# Navigate to admin dashboard folder
cd admin-dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file
# Set REACT_APP_API_URL=http://localhost:5000/api/v1

# Start development server
npm start
```

Admin dashboard should open at `http://localhost:3000`

### 4. Mobile App Setup

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file
# Set API_URL=http://localhost:5000/api/v1
# Set STRIPE_PUBLISHABLE_KEY=pk_test_...

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Run on iOS (macOS only)
npm run ios

# OR run on Android
npm run android
```

**Troubleshooting Mobile:**
- iOS: If build fails, open `ios/ArtHub.xcworkspace` in Xcode and build from there
- Android: Ensure Android emulator is running or device is connected
- Network: Use your computer's local IP instead of localhost for mobile (e.g., `http://192.168.1.100:5000/api/v1`)

---

## AWS S3 Setup

1. **Create S3 Bucket:**
   - Log into AWS Console
   - Navigate to S3
   - Click "Create bucket"
   - Name: `art-hub-images-dev` (or your choice)
   - Region: `us-east-1` (or your choice)
   - **Uncheck** "Block all public access" (images need to be publicly viewable)
   - Create bucket

2. **Configure CORS:**
   - Click on your bucket
   - Go to "Permissions" tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Add this configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Create IAM User:**
   - Navigate to IAM in AWS Console
   - Create new user: `art-hub-s3-user`
   - Attach policy: `AmazonS3FullAccess` (or create custom policy for your bucket only)
   - Save Access Key ID and Secret Access Key
   - Add these to backend `.env` file

---

## Stripe Setup

1. **Get Test API Keys:**
   - Log into [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Copy "Publishable key" (starts with `pk_test_`)
   - Copy "Secret key" (starts with `sk_test_`)

2. **Enable Stripe Connect:**
   - Go to [Connect Settings](https://dashboard.stripe.com/settings/connect)
   - Enable "Stripe Connect" for your account
   - Set up branding (optional)

3. **Set up Webhooks (for local testing):**
   - Install Stripe CLI: [Instructions](https://stripe.com/docs/stripe-cli)
   - Run: `stripe login`
   - Forward webhooks to local server:
     ```bash
     stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
     ```
   - Copy the webhook signing secret (starts with `whsec_`)
   - Add to backend `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Testing the Setup

### 1. Create Admin Account (via Database)
```sql
-- Connect to database
psql art_hub_db

-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
VALUES (
  'admin@arthub.com',
  '$2a$10$X3rT5YqZ9tJ8eXQmK.4QJO5vQ3xH8fL2pW9dN6kR1sM7gB4hC3jKy',
  'admin',
  'Admin',
  'User',
  true
);
```

### 2. Test Login (Admin Dashboard)
- Go to `http://localhost:3000/login`
- Email: `admin@arthub.com`
- Password: `admin123`

### 3. Generate Artist Invite Code
- Use admin dashboard or run SQL:
```sql
INSERT INTO invite_codes (code, created_by)
VALUES ('ARTIST2024', (SELECT id FROM users WHERE email = 'admin@arthub.com'));
```

### 4. Test Mobile App
- Open mobile app
- Register as artist using invite code `ARTIST2024`
- Complete artist profile
- Upload sample art piece

---

## Common Issues & Solutions

### Backend won't start
- **Issue:** Database connection error
- **Solution:** Check PostgreSQL is running: `pg_isready`
- **Solution:** Verify `.env` database credentials

### Mobile app can't connect to API
- **Issue:** Network error or timeout
- **Solution:** Use computer's local IP, not `localhost`
- **Solution:** Ensure backend is running and accessible
- **Solution:** Check firewall settings

### S3 upload fails
- **Issue:** Access denied or credentials error
- **Solution:** Verify AWS credentials in `.env`
- **Solution:** Check IAM user has S3 permissions
- **Solution:** Verify bucket name matches configuration

### Stripe payment fails
- **Issue:** Invalid API key or network error
- **Solution:** Ensure using test keys (not live keys)
- **Solution:** Check Stripe publishable key matches in mobile `.env`
- **Solution:** Verify webhook secret if using webhooks

---

## Development Workflow

### Daily Development Routine

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start admin dashboard:**
   ```bash
   cd admin-dashboard
   npm start
   ```

3. **Start mobile app:**
   ```bash
   cd mobile
   npm start
   # In another terminal:
   npm run ios  # or npm run android
   ```

4. **Start Stripe webhook forwarding (if testing payments):**
   ```bash
   stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
   ```

### Making Changes

- **Backend changes:** Server auto-restarts (nodemon)
- **Admin changes:** Browser auto-refreshes
- **Mobile changes:** 
  - JavaScript: Shake device → "Reload" or press `r` in terminal
  - Native code: Rebuild app (`npm run ios/android`)

---

## Next Steps After Setup

1. [ ] Implement user authentication (register, login, JWT)
2. [ ] Build invite code validation
3. [ ] Create art upload with S3 integration
4. [ ] Implement admin approval workflow
5. [ ] Build feed algorithm (random + promoted)
6. [ ] Integrate Stripe checkout flow
7. [ ] Test end-to-end user journey

---

## Useful Commands Reference

### Backend
```bash
npm run dev          # Start development server
npm run migrate      # Run database migrations
npm run seed         # Seed sample data
npm test             # Run tests
```

### Admin Dashboard
```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
```

### Mobile
```bash
npm start            # Start Metro bundler
npm run ios          # Run iOS app
npm run android      # Run Android app
npm run lint         # Check code style
```

### Database
```bash
psql art_hub_db                    # Connect to database
pg_dump art_hub_db > backup.sql    # Backup database
psql art_hub_db < backup.sql       # Restore database
```

---

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Stripe API Docs](https://stripe.com/docs/api)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [Material-UI Docs](https://mui.com/)

---

**Need Help?** Check the `docs/` folder for detailed documentation on:
- `DATABASE_SCHEMA.md` - Complete database structure
- `API_ENDPOINTS.md` - All API routes and examples
- `PROJECT_OVERVIEW.md` - Full project details

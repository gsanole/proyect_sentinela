# Art Hub - Project Overview

## 📱 Project Description

Art Hub is a curated marketplace platform for physical art, starting in Milwaukee with plans to expand nationwide. The platform connects artists with art collectors through a commission-based model where the platform acts as a trusted intermediary.

## 🎯 Business Model

- **Artists**: Invite-only, ship art to central storage location
- **Platform**: Curates listings, stores art, manages sales, takes commission
- **Buyers**: Browse, purchase, and pick up art from physical location
- **Revenue**: Commission on each sale (configurable %)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App (React Native)               │
│                      iOS & Android                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Backend API (Node.js + Express)                 │
│  ┌────────────┬────────────┬────────────┬─────────────┐    │
│  │PostgreSQL  │   AWS S3   │  Stripe    │   JWT Auth  │    │
│  │   (RDS)    │  (Images)  │ (Payments) │             │    │
│  └────────────┴────────────┴────────────┴─────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Same REST API
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Admin Dashboard (React Web)                   │
│          Artist & Art Approval, Orders, Payouts             │
└─────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
art_hub_app/
├── mobile/              # React Native mobile app
│   ├── src/
│   │   ├── screens/     # Home, Explore, Cart, Profile, etc.
│   │   ├── navigation/  # Bottom tabs + Stack navigation
│   │   ├── redux/       # State management (auth, art, cart)
│   │   └── services/    # API client
│   └── package.json
│
├── backend/             # Node.js + Express API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, validation
│   │   ├── config/      # DB, S3, Stripe setup
│   │   └── app.js
│   └── package.json
│
├── admin-dashboard/     # React web admin panel
│   ├── src/
│   │   ├── pages/       # Dashboard, Artists, Orders, etc.
│   │   └── components/
│   └── package.json
│
└── docs/
    ├── DATABASE_SCHEMA.md
    └── API_ENDPOINTS.md
```

## 🔑 Key Features

### For Buyers (Mobile App)
- ✅ Instagram-style feed with random + promoted art
- ✅ Search with filters (category, price, medium, artist)
- ✅ Artist profiles with following
- ✅ Shopping cart and Stripe checkout
- ✅ Favorites/saved art
- ✅ Order tracking
- ✅ 7-day pickup window
- ✅ Reviews and ratings

### For Artists (Mobile App)
- ✅ Invite-code only registration
- ✅ Profile with bio, links, portfolio
- ✅ Upload art listings (pending approval)
- ✅ Pay to promote listings in feed
- ✅ View sales and earnings
- ✅ Stripe Connect for payouts

### For Admins (Web Dashboard)
- ✅ Generate artist invite codes
- ✅ Approve/reject art listings
- ✅ Manage orders and pickups
- ✅ Process refunds with cancellation fees
- ✅ Process artist payouts
- ✅ Analytics dashboard

## 💾 Database Schema Highlights

**17 Tables:**
1. `users` - All accounts (buyers, artists, admins)
2. `artist_profiles` - Extended artist info
3. `invite_codes` - Artist invitation system
4. `art_pieces` - Listings with approval workflow
5. `art_images` - Multiple images per piece (S3)
6. `categories` & `tags` - Filtering system
7. `promoted_listings` - Paid feed boosts
8. `orders` & `order_items` - Purchases
9. `favorites` & `follows` - Social features
10. `reviews` - Post-pickup ratings
11. `payouts` - Artist payment tracking
12. `notifications` - User alerts

See `docs/DATABASE_SCHEMA.md` for full schema.

## 🔌 API Architecture

**Base URL:** `/api/v1`

**Main Endpoints:**
- `/auth` - Registration, login, password reset
- `/users` - User profile management
- `/artists` - Artist profiles and analytics
- `/art-pieces` - Listings, search, promotion
- `/cart` & `/orders` - Shopping and checkout
- `/favorites` & `/follows` - Social features
- `/reviews` - Ratings after pickup
- `/admin` - Admin-only operations
- `/webhooks/stripe` - Payment events

See `docs/API_ENDPOINTS.md` for complete API docs.

## 🛠️ Tech Stack

### Mobile (iOS & Android)
- **React Native** 0.72
- **React Navigation** - Stack + Bottom Tabs
- **Redux Toolkit** - State management
- **Stripe React Native SDK** - Payments
- **React Native Paper** - UI components
- **Axios** - API client

### Backend
- **Node.js** + **Express**
- **PostgreSQL** (AWS RDS) - Relational data
- **AWS S3** - Image storage
- **Stripe Connect** - Marketplace payments
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Admin Dashboard
- **React** 18
- **Material-UI** - UI framework
- **React Router** - Navigation
- **Chart.js** - Analytics visualizations
- **Axios** - API client

### Infrastructure (AWS)
- **EC2/Elastic Beanstalk** - API hosting
- **RDS** - PostgreSQL database
- **S3** - Image storage
- **CloudFront** - CDN for images

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with DB, AWS, Stripe credentials
npm run migrate  # Run database migrations
npm run dev      # Start development server
```

### 2. Mobile App Setup
```bash
cd mobile
npm install
cp .env.example .env
# Configure .env with API URL and Stripe key
npm run ios      # Run on iOS
npm run android  # Run on Android
```

### 3. Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
cp .env.example .env
# Configure .env with API URL
npm start        # Start development server
```

## 📋 Development Phases

### Phase 1: MVP (Minimum Viable Product) ✅ PLANNED
- ✅ Database schema designed
- ✅ API endpoints planned
- ✅ Project structure created
- ⏳ Authentication implementation
- ⏳ Artist invite system
- ⏳ Art listing & approval workflow
- ⏳ Basic feed (random + promoted)
- ⏳ Shopping cart & checkout
- ⏳ Stripe integration
- ⏳ Pickup tracking

### Phase 2: Social Features
- Following artists
- Favorites/saved items
- Reviews and ratings
- Artist analytics
- Push notifications

### Phase 3: Advanced Features
- Advanced search & filters
- Delivery option (beyond pickup)
- Email notifications
- Mobile app onboarding
- Enhanced admin analytics

### Phase 4: Scale & Expansion
- Multi-location support
- Regional expansion beyond Milwaukee
- Performance optimizations
- Advanced caching (Redis)
- Automated testing suite

## 🔒 Security Considerations

- ✅ JWT authentication with secure tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on API endpoints
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Input validation and sanitization
- ✅ Stripe webhooks with signature verification
- ⏳ SSL/TLS certificates for production
- ⏳ Environment variable management
- ⏳ Regular security audits

## 💰 Payment Flow

1. Buyer adds art to cart
2. Checkout initiates Stripe Payment Intent
3. Buyer enters payment info in mobile app
4. Stripe charges buyer's card
5. Platform receives payment (minus Stripe fee)
6. Order created with 7-day pickup window
7. After pickup confirmation:
   - Platform keeps commission (configurable %)
   - Artist receives payout via Stripe Connect

## 📊 Key Metrics to Track

- Total sales volume
- Commission revenue
- Active artists
- Active buyers
- Average order value
- Pickup completion rate
- Cancellation rate
- Artist payout frequency
- Popular art categories
- User retention

## 🎨 Design Philosophy

- **Mobile-first**: Primary user experience on mobile
- **Curated**: Quality over quantity - all listings approved
- **Instagram-inspired**: Familiar, engaging feed interface
- **Local-first**: Start small (Milwaukee), scale smart
- **Trust**: Platform holds art, ensures quality, fair transactions

## 📞 Next Steps

1. **Set up development environments** (PostgreSQL, AWS, Stripe test accounts)
2. **Implement authentication** (registration, login, JWT)
3. **Build artist invite system** (invite codes, artist onboarding)
4. **Create art listing workflow** (upload, approval, S3 integration)
5. **Develop feed algorithm** (random + promoted mix)
6. **Implement shopping cart & checkout** (Stripe integration)
7. **Build admin approval interface** (art & artist management)
8. **Test end-to-end flows** (artist onboarding → listing → sale → payout)
9. **Deploy to staging environment** (AWS infrastructure)
10. **Beta testing with select Milwaukee artists**

---

**Current Status:** ✅ Planning Complete | ⏳ Ready for Implementation

**Estimated MVP Timeline:** 3-4 months with dedicated development

**Initial Launch Market:** Milwaukee, WI

**Contact:** [Your contact info here]

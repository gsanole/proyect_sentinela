# API Endpoints Documentation

Base URL: `/api/v1`

## Authentication

### POST /auth/register
Register a new buyer account.
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+14141234567"
}
```

### POST /auth/register/artist
Register a new artist account (requires invite code).
```json
{
  "email": "artist@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Artist",
  "inviteCode": "ABC123XYZ",
  "displayName": "Jane Artist Studio",
  "bio": "Contemporary painter...",
  "instagram": "@janeartist"
}
```

### POST /auth/login
Login to get JWT token.
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /auth/logout
Logout (invalidate token).

### POST /auth/refresh-token
Refresh JWT token.

### POST /auth/forgot-password
Request password reset email.

### POST /auth/reset-password
Reset password with token.

---

## Users

### GET /users/me
Get current user profile.

### PUT /users/me
Update current user profile.

### PUT /users/me/password
Change password.

### DELETE /users/me
Delete account.

---

## Artists

### GET /artists
List all verified artists (paginated, filterable).
- Query params: `page`, `limit`, `search`, `sortBy`

### GET /artists/:id
Get artist profile by ID.

### GET /artists/:id/art-pieces
Get all art pieces by artist.

### PUT /artists/me/profile
Update artist profile (artist only).

### POST /artists/me/stripe-connect
Initiate Stripe Connect onboarding.

### GET /artists/me/analytics
Get artist analytics (views, sales, earnings).

---

## Art Pieces

### GET /art-pieces
Get art pieces feed (paginated).
- Query params: `page`, `limit`, `status=approved`, `promoted=true`

### GET /art-pieces/search
Search and filter art pieces.
- Query params: `query`, `category`, `minPrice`, `maxPrice`, `medium`, `artistId`

### GET /art-pieces/:id
Get single art piece details.

### POST /art-pieces
Create new art listing (artist only).
```json
{
  "title": "Sunset Dreams",
  "description": "Acrylic on canvas...",
  "price": 450.00,
  "medium": "Acrylic",
  "dimensions": "24x36 inches",
  "yearCreated": 2024,
  "categoryIds": ["uuid1", "uuid2"],
  "tags": ["sunset", "landscape", "modern"]
}
```

### POST /art-pieces/:id/images
Upload images for art piece (multipart/form-data).

### PUT /art-pieces/:id
Update art piece (artist only, if not approved yet).

### DELETE /art-pieces/:id
Delete art piece (artist only, if not sold).

### POST /art-pieces/:id/promote
Create promoted listing (artist pays for boost).
```json
{
  "duration": 7, // days
  "boostMultiplier": 10
}
```

---

## Categories & Tags

### GET /categories
List all categories.

### GET /tags
List popular tags.

---

## Favorites

### GET /favorites
Get user's favorited art pieces.

### POST /favorites/:artPieceId
Add art piece to favorites.

### DELETE /favorites/:artPieceId
Remove from favorites.

---

## Follows

### GET /follows
Get artists user is following.

### POST /follows/:artistId
Follow an artist.

### DELETE /follows/:artistId
Unfollow an artist.

---

## Cart & Orders

### GET /cart
Get current user's cart (session-based or DB).

### POST /cart
Add item to cart.
```json
{
  "artPieceId": "uuid"
}
```

### DELETE /cart/:artPieceId
Remove item from cart.

### POST /orders/checkout
Create order from cart.
```json
{
  "artPieceIds": ["uuid1", "uuid2"]
}
```

### POST /orders/:id/payment
Process payment via Stripe.
```json
{
  "paymentMethodId": "pm_xxx"
}
```

### GET /orders
Get user's orders.

### GET /orders/:id
Get order details.

### POST /orders/:id/cancel
Cancel order (before pickup, may incur cancellation fee).

### POST /orders/:id/confirm-pickup
Mark order as picked up (admin only).

---

## Reviews

### GET /reviews/artist/:artistId
Get reviews for an artist.

### GET /reviews/art-piece/:artPieceId
Get reviews for an art piece.

### POST /reviews
Create review (after pickup).
```json
{
  "orderId": "uuid",
  "artPieceId": "uuid",
  "rating": 5,
  "comment": "Beautiful piece!"
}
```

### PUT /reviews/:id
Update review.

### DELETE /reviews/:id
Delete review.

---

## Notifications

### GET /notifications
Get user's notifications.

### PUT /notifications/:id/read
Mark notification as read.

### PUT /notifications/read-all
Mark all as read.

---

## Admin Endpoints

### POST /admin/invite-codes
Generate new artist invite code.
```json
{
  "expiresInDays": 30
}
```

### GET /admin/invite-codes
List all invite codes.

### GET /admin/art-pieces/pending
Get all pending art listings for approval.

### PUT /admin/art-pieces/:id/approve
Approve art listing.

### PUT /admin/art-pieces/:id/reject
Reject art listing.
```json
{
  "reason": "Does not meet quality standards"
}
```

### GET /admin/orders
Get all orders with filters.

### POST /admin/orders/:id/confirm-pickup
Confirm order pickup.

### POST /admin/orders/:id/process-return
Process return and refund.
```json
{
  "applyCancellationFee": true
}
```

### GET /admin/payouts/pending
Get pending artist payouts.

### POST /admin/payouts/process
Process artist payouts via Stripe.

### GET /admin/analytics
Get platform analytics (sales, users, revenue).

### PUT /admin/art-pieces/:id/cancellation-fee
Set cancellation fee for art piece.
```json
{
  "cancellationFee": 25.00
}
```

---

## Stripe Webhooks

### POST /webhooks/stripe
Handle Stripe webhook events.
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `transfer.created`
- `transfer.failed`

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

### Pagination Format
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

## Rate Limiting

- Public endpoints: 100 requests/minute
- Authenticated endpoints: 500 requests/minute
- Admin endpoints: 1000 requests/minute

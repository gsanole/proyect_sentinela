# Art Hub App

A marketplace platform for physical art in Milwaukee, connecting artists with art collectors.

## Project Structure

```
art_hub_app/
├── mobile/              # React Native mobile app (iOS & Android)
├── backend/             # Node.js + Express API server
├── admin-dashboard/     # React web app for admin panel
└── docs/                # Documentation and schemas
```

## Tech Stack

### Mobile App
- React Native
- React Navigation
- Redux Toolkit (state management)
- Axios (API client)

### Backend
- Node.js + Express
- PostgreSQL (AWS RDS)
- AWS S3 (image storage)
- Stripe Connect (payments)
- JWT authentication

### Admin Dashboard
- React.js
- Material-UI or Tailwind CSS
- Same backend API

### Infrastructure (AWS)
- EC2/Elastic Beanstalk (API hosting)
- RDS (PostgreSQL database)
- S3 (image storage)
- CloudFront (CDN)

## Getting Started

See individual README files in each project folder for setup instructions.

## Core Features

- **Artists**: Invite-only artist accounts with profiles and portfolios
- **Art Listings**: Curated physical art with admin approval
- **Marketplace**: Instagram-style feed with search and filters
- **Payments**: Stripe integration with commission-based payouts
- **Pickup System**: 7-day pickup window with cancellation fees
- **Social Features**: Follow artists, save favorites, leave reviews
- **Promoted Listings**: Artists can boost visibility in feed

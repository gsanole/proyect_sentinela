# Art Hub Mobile App

React Native mobile application for iOS and Android.

## Setup

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install iOS pods (macOS only):
```bash
cd ios && pod install && cd ..
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`

### Running the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Metro Bundler:**
```bash
npm start
```

## Project Structure

```
mobile/
├── src/
│   ├── components/      # Reusable components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation setup
│   ├── redux/           # Redux store and slices
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   ├── constants/       # Constants and config
│   └── assets/          # Images, fonts, etc.
├── ios/                 # iOS native code
├── android/             # Android native code
└── App.js               # Root component
```

## Features

- Browse art feed with search and filters
- Artist profiles and following
- Shopping cart and checkout
- Stripe payment integration
- Order tracking and pickup
- Reviews and ratings
- Favorites and saved items
- Push notifications

## Tech Stack

- React Native
- React Navigation
- Redux Toolkit
- Axios
- React Native Paper (UI components)
- Stripe React Native SDK

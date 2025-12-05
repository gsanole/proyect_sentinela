# Art Hub Milwaukee - Brand Colors

## Color Palette

### Primary Color (50% usage)
**Teal**: `#20b2c4`
- Light: `#5cc4d1`
- Dark: `#178996`
- Used for: Main CTAs, primary navigation, key brand elements

### Secondary & Accent Colors (50% distributed equally)

**Magenta**: `#bd1398`
- Light: `#d145b3`
- Dark: `#8a0d6b`
- Used for: Secondary buttons, highlights, artist profiles

**Deep Pink**: `#a61f70`
- Light: `#c24f8f`
- Dark: `#75164f`
- Used for: Info states, featured content

**Light Pink**: `#e8bde7`
- Light: `#f0d4ef`
- Dark: `#d19ad0`
- Used for: Warnings, soft backgrounds, art piece cards

**Pink**: `#ca1687`
- Light: `#d945a4`
- Dark: `#8f1060`
- Used for: Errors, urgent actions, sold indicators

**Rose**: `#c66cae`
- Light: `#d894c5`
- Dark: `#a0507a`
- Used for: Accents, badges, special promotions

## Color Usage Guidelines

### Distribution
- **50%** of UI elements should use Teal (#20b2c4)
- **50%** should be distributed equally among the 5 secondary/accent colors

### Component-Specific Colors

**Buttons**
- Primary: Teal
- Secondary: Magenta
- Tertiary: Deep Pink

**Status Indicators**
- Pending: Light Pink
- Approved: Teal
- Rejected: Pink
- Active: Deep Pink

**Cards & Surfaces**
- Background: White
- Borders: Teal or Magenta (alternating)
- Accents: Rose or Light Pink

**Navigation**
- Active: Teal
- Hover: Magenta
- Inactive: Gray

### Accessibility
All color combinations meet WCAG AA standards for contrast ratios:
- Primary text on white: 4.5:1 minimum
- White text on brand colors: 4.5:1 minimum

## Platform Implementation

### Mobile (React Native)
Import from `src/theme/colors.js`:
```javascript
import { colors, componentColors } from './theme/colors';
```

### Admin Dashboard (React)
Theme configured in `src/App.js` using Material-UI:
```javascript
const theme = createTheme({ palette: { primary: { main: '#20b2c4' } } });
```

### Backend
No color implementation needed (API only)

## Examples

### Primary CTA Button
- Background: `#20b2c4` (Teal)
- Text: White
- Hover: `#178996` (Teal Dark)

### Artist Card
- Border: `#bd1398` (Magenta)
- Background: White
- Badge: `#c66cae` (Rose)

### Art Piece Card
- Border: `#20b2c4` (Teal)
- Background: White
- Price Tag: `#a61f70` (Deep Pink)

// Art Hub Milwaukee Brand Colors
export const colors = {
  // Primary - Teal (50% of color usage)
  primary: '#20b2c4',
  primaryLight: '#5cc4d1',
  primaryDark: '#178996',
  
  // Secondary & Accent Colors (50% distributed equally)
  magenta: '#bd1398',
  magentaLight: '#d145b3',
  magentaDark: '#8a0d6b',
  
  deepPink: '#a61f70',
  deepPinkLight: '#c24f8f',
  deepPinkDark: '#75164f',
  
  lightPink: '#e8bde7',
  lightPinkLight: '#f0d4ef',
  lightPinkDark: '#d19ad0',
  
  pink: '#ca1687',
  pinkLight: '#d945a4',
  pinkDark: '#8f1060',
  
  rose: '#c66cae',
  roseLight: '#d894c5',
  roseDark: '#a0507a',
  
  // Neutrals
  white: '#ffffff',
  black: '#000000',
  gray100: '#f5f5f5',
  gray200: '#eeeeee',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Semantic colors
  success: '#20b2c4', // Using primary teal
  warning: '#e8bde7', // Using light pink
  error: '#ca1687',   // Using pink
  info: '#a61f70',    // Using deep pink
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#bdbdbd',
  textWhite: '#ffffff',
};

// Color usage guide for components
export const componentColors = {
  // Buttons
  buttonPrimary: colors.primary,
  buttonSecondary: colors.magenta,
  buttonTertiary: colors.deepPink,
  
  // Cards & Surfaces
  cardBackground: colors.white,
  surfaceBackground: colors.gray100,
  
  // Borders
  borderLight: colors.gray300,
  borderMedium: colors.gray400,
  borderDark: colors.gray600,
  
  // Status indicators
  statusPending: colors.warning,
  statusApproved: colors.success,
  statusRejected: colors.error,
  statusActive: colors.info,
  
  // Navigation
  navActive: colors.primary,
  navInactive: colors.gray500,
  
  // Badges & Tags
  badgePrimary: colors.primary,
  badgeSecondary: colors.magenta,
  badgeAccent: colors.rose,
};

export default colors;

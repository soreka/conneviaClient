// Design palette for Connevia Pilates App
// Based on exact design specifications
export const colors = {
  // Primary colors
  primary: '#A68CD4',           // Soft Purple - buttons, links, focus rings
  primaryForeground: '#FFFFFF', // Text on primary buttons
  
  // Secondary/Accent
  secondary: '#F2C6DE',         // Light Pink - secondary buttons
  accent: '#FCE8F0',            // Very Light Pink - header gradient start
  
  // Backgrounds
  background: '#FFFFFF',        // Page background, gradient end
  card: '#FFFFFF',              // Card backgrounds
  muted: '#F5F3F7',             // Disabled backgrounds
  
  // Text colors
  foreground: '#666666',        // Main text color (40% gray)
  mutedForeground: '#8C8C8C',   // Placeholder text, subtle text (55% gray)
  
  // Borders
  border: '#E8E3ED',            // Input borders, dividers
  input: '#E8E3ED',             // Input border color
  
  // Focus
  ring: '#A68CD4',              // Focus outline color
  
  // Button states
  primaryPressed: '#9577C9',    // Primary button pressed (10% darker)
} as const;

export type ColorKey = keyof typeof colors;

// Spacing constants (matching design spec)
export const spacing = {
  xs: 4,    // space-y-1
  sm: 6,    // space-y-1.5
  md: 8,    // space-y-2, gap-2
  lg: 16,   // space-y-4, p-4, py-4
  xl: 24,   // p-6
} as const;

// Border radius constants
export const radius = {
  sm: 4,    // rounded-sm
  md: 8,    // rounded-md - buttons, inputs
  lg: 16,   // rounded-lg - cards
} as const;

// Shadow presets for React Native
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
} as const;

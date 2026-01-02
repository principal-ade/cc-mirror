/**
 * Theme constants for CC-MIRROR TUI
 *
 * Professional deep blue and golden yellow color scheme.
 * Warm, inviting, and memorable.
 */

// Primary color palette - deep blue and golden yellow
export const colors = {
  // Brand colors - professional and inviting
  primary: 'blue',
  primaryBright: 'blueBright',
  secondary: 'yellow',
  secondaryBright: 'yellowBright',
  accent: 'blueBright',
  gold: 'yellow',
  goldBright: 'yellowBright',

  // Status colors
  success: 'greenBright',
  warning: 'yellowBright',
  error: 'redBright',
  info: 'blueBright',

  // Text colors
  text: 'white',
  textBright: 'whiteBright',
  textMuted: 'gray',
  textDim: 'blackBright',
  textGold: 'yellow',

  // Border colors
  border: 'blue',
  borderFocus: 'blueBright',
  borderAccent: 'yellow',
  borderGold: 'yellow',

  // Logo colors - deep blue to gold gradient feel
  logo1: 'blueBright',
  logo2: 'yellow',
  logo3: 'yellowBright',
  logoAccent: 'white',
} as const;

// Unicode icons - clean and minimal
export const icons = {
  // Navigation
  pointer: '▸',
  pointerEmpty: ' ',

  // Status
  check: '✓',
  cross: '✗',
  warning: '!',
  bullet: '•',
  star: '★',

  // Progress
  progressFull: '█',
  progressEmpty: '░',

  // Arrows
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',
} as const;

// Spinner frames (simple dots)
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

// Keyboard hints
export const keyHints = {
  navigate: '↑↓ Navigate',
  select: '↵ Select',
  back: 'Esc Back',
  continue: '↵ Continue',
} as const;

export type ColorKey = keyof typeof colors;
export type IconKey = keyof typeof icons;

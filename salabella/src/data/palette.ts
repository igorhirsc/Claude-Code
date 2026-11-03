/**
 * Brand palette as hex strings for three.js and canvas code. Mirrors
 * src/styles/tokens.css exactly. Kept free of three.js imports so DOM code
 * (e.g. contrast checks) can use it without pulling WebGL into the main bundle.
 */
export const palette = {
  linen50: '#fbf8f3',
  linen100: '#f6f1e8',
  linen200: '#ede4d3',
  linen300: '#ddcfb4',
  ink900: '#17140f',
  ink800: '#221e17',
  ink700: '#2e2820',
  ink600: '#4a4234',
  clay400: '#c98554',
  clay500: '#b5652f',
  clay600: '#954f24',
  brass200: '#e8d6ae',
  brass300: '#dcc38b',
  brass400: '#c9a15a',
  brass500: '#a9803e',
  moss500: '#4b5842',
  moss600: '#3a4433',
  cream: '#f1ece1',
} as const

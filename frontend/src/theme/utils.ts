export const stylesMode = {
  light: '[data-theme="light"] &',
  dark: '[data-theme="dark"] &',
};

/**
 * Set font family
 */
export function setFont(fontName: string) {
  return `"${fontName}",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`;
}

/**
 * Color with alpha channel
 * Supports RGB channels (e.g., "0 184 217") or CSS variables with "Channel" prefix
 */
export function varAlpha(color: string, opacity = 1) {
  const unsupported =
    color.startsWith('#') ||
    color.startsWith('rgb') ||
    color.startsWith('rgba') ||
    (!color.includes('var') && color.includes('Channel'));

  if (unsupported) {
    throw new Error(
      `[Alpha]: Unsupported color format "${color}".
       Supported formats are:
       - RGB channels: "0 184 217".
       - CSS variables with "Channel" prefix: "var(--palette-common-blackChannel, #000000)".
       Unsupported formats are:
       - Hex: "#00B8D9".
       - RGB: "rgb(0, 184, 217)".
       - RGBA: "rgba(0, 184, 217, 1)".
       `
    );
  }

  return `rgba(${color} / ${opacity})`;
}

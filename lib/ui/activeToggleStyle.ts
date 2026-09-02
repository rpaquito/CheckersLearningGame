/**
 * Shared "active" style for toggle-style selection groups across the app
 * (difficulty/color in /configurar and /opcoes) -- one shared value instead
 * of repeating the same gradient by hand in each file. Inline instead of a
 * Tailwind bg-gradient-to-br utility: safer than depending on the exact
 * utility name (renamed across some Tailwind v4 versions).
 */
export const ACTIVE_TOGGLE_STYLE = {
  background: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
  color: '#0B2E30',
};

/**
 * Shared "active" style for toggle-style selection groups across the app.
 * Used by /opcoes (via ToggleGroup), GameSetup's difficulty/color ToggleGroups
 * (/configurar), and LearningPanel's chip-style buttons -- all restyled with
 * this shared style in the ui-parity-and-game-completion phase. Inline instead
 * of a Tailwind bg-gradient-to-br utility: safer than depending on the exact
 * utility name (renamed across some Tailwind v4 versions).
 */
export const ACTIVE_TOGGLE_STYLE = {
  background: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
  color: '#0B2E30',
};

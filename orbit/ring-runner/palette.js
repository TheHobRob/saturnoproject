// palette.js — every color Ring Runner draws with.
// Change art direction here; game.js never hardcodes a color.
// Site palette only (styles.css :root, its dark-mode set, and the logo's ring
// gold). The site has no red, so hazards use the brightest gold instead.
export const palette = {
  ink: '#2E2517', // --ink
  paper: '#F2ECDD', // --paper: player, text
  steel: '#B08F52', // logo ring gold: debris, secondary text
  signal: '#5D6A39', // --signal
  glow: '#8FA35E', // --signal (dark mode): player thrust, prompts, boss
  hot: '#D4B67F', // --steel (dark mode): hazards, enemy shots, boss damage
  bg: '#2E2517', // --ink
  band: '#453B28', // --rule (dark mode): ring bands, HUD bars
  dust: '#705729' // --steel: drifting ring dust
};

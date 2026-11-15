/* GoSpace — Custom 24x24 technical aerospace vector glyphs (zero emoji UI). */

const P = (d) => `<path d="${d}"/>`;
const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;

const ICONS = {
  /* Stages & navigation */
  hangar: P('M3 21V9.5L12 4l9 5.5V21') + P('M7 21v-7h10v7') + P('M7 17.5h10') + P('M3 21h18'),
  launchpad: P('M4 21h16') + P('M7 21V4') + P('M7 8h3.5') + P('M7 12.5h3.5') + P('M15.5 4.5l2 2.5v9h-4V7z') + P('M14.5 19v2') + P('M16.5 19v2'),
  orbit: C(12, 12, 3) + `<ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-24 12 12)"/>` + P('M19.6 6.6h.01'),
  debrief: P('M8.5 3.5h7v3h-7z') + P('M6.5 5H5v16h14V5h-1.5') + P('M8.5 13l2.5 2.5 4.5-4.5'),
  quit: P('M14 4H5v16h9') + P('M10 12h10') + P('M17 8.5l3.5 3.5-3.5 3.5'),
  play: P('M7 4.5l12 7.5-12 7.5z'),
  pause: P('M8 5v14') + P('M16 5v14'),
  warp: P('M4.5 6l6 6-6 6') + P('M12 6l6 6-6 6') + P('M20 5v14'),
  skip: P('M5.5 5l9 7-9 7z') + P('M18.5 5v14'),
  help: C(12, 12, 9) + P('M9.4 9.4a2.6 2.6 0 0 1 5.2 0c0 1.9-2.6 2.1-2.6 4.1') + P('M12 17v.6'),
  'music-on': P('M9 18V5.5l11-2.2V16') + C(6, 18, 3) + C(17, 16, 3),
  'music-off': P('M9 18V5.5l11-2.2V16') + C(6, 18, 3) + C(17, 16, 3) + P('M3 3l18 18'),
  'sfx-on': P('M4 9h4l5-4v14l-5-4H4z') + P('M16 9.2a4 4 0 0 1 0 5.6') + P('M18.6 6.6a7.6 7.6 0 0 1 0 10.8'),
  'sfx-off': P('M4 9h4l5-4v14l-5-4H4z') + P('M16.5 9.5l5 5') + P('M21.5 9.5l-5 5'),
  restart: P('M4.5 12a7.5 7.5 0 1 0 2.2-5.3') + P('M4.5 4v4.5H9'),
  home: P('M3 11.5L12 4l9 7.5') + P('M6 9.5V20h12V9.5') + P('M10 20v-5.5h4V20'),

  /* Spacecraft, gauges & subsystems */
  goal: P('M5 21V3.5') + P('M5 4h12.5l-2.5 4 2.5 4H5'),
  spacecraft: P('M9 9h6v6H9z') + P('M2.5 9.5h4.5v5H2.5z') + P('M17 9.5h4.5v5H17z') + P('M7 12h2') + P('M15 12h2') + P('M12 15v3') + P('M10 20h4') + P('M12 6V9'),
  rocket: P('M12 2.5c2.9 2.4 4 5.8 4 9.5v4.5H8V12c0-3.7 1.1-7.1 4-9.5z') + P('M8 12.5l-3 3V20l3-2') + P('M16 12.5l3 3V20l-3-2') + P('M10.2 20h3.6') + C(12, 9, 1.5),
  antenna: P('M4.5 10.5a7.5 7.5 0 0 0 9 9z') + P('M9 15l5-5') + P('M14 10l2.5-2.5') + P('M17 3.5a3.5 3.5 0 0 1 3.5 3.5') + P('M16.5 21h-7'),
  autobuild: P('M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z') + P('M13 7l-3.2 5.6h4.4L11 17'),
  manifest: P('M5 3.5h14v17H5z') + P('M8 8h8') + P('M8 12h8') + P('M8 16h5'),
  budget: C(12, 12, 9) + P('M15 8.6h-4.1a1.9 1.9 0 0 0 0 3.8h2.2a1.9 1.9 0 0 1 0 3.8H9') + P('M12 6v2.6') + P('M12 16.2V18'),
  mass: P('M7 8.5h10l3 12.5H4z') + C(12, 5.5, 2.5) + P('M10 15h4'),
  power: P('M13.5 2L5 14h6.2l-1 8L19 10h-6.2z'),
  data: P('M4 20v-4') + P('M9 20v-8') + P('M14 20V8.5') + P('M19 20V4'),
  lifetime: P('M6 3h12') + P('M6 21h12') + P('M7.5 3v3.2L12 12l-4.5 5.8V21') + P('M16.5 3v3.2L12 12l4.5 5.8V21'),
  science: P('M9 3h6') + P('M10 3v6.2L5 18.4A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3') + P('M7.4 15h9.2'),
  hull: P('M12 3l8 3v6c0 4.9-3.4 8-8 9-4.6-1-8-4.1-8-9V6z') + P('M12 7v10'),
  battery: P('M3 8h16v8H3z') + P('M21 10.5v3') + P('M6 11v2') + P('M9 11v2') + P('M12 11v2'),
  camera: P('M3 7.5h4L9 4.5h6l2 3h4V20H3z') + C(12, 13.5, 3.8),
  rotate: P('M19.5 12a7.5 7.5 0 1 1-2.2-5.3') + P('M19.5 4v4.5H15'),
  explode: P('M9 9h6v6H9z') + P('M3.5 3.5l3.5 3.5') + P('M20.5 3.5L17 7') + P('M3.5 20.5L7 17') + P('M20.5 20.5L17 17'),
  target: C(12, 12, 7) + P('M12 2v4') + P('M12 18v4') + P('M2 12h4') + P('M18 12h4') + C(12, 12, 1.4),
  warning: P('M12 3l10 18H2z') + P('M12 9.5v5') + P('M12 17.5v.6'),
  check: P('M4 12.5l5 5L20 6.5'),
  lock: P('M5 11h14v10H5z') + P('M8 11V7.5a4 4 0 0 1 8 0V11') + P('M12 14.5v3'),

  /* Supporting glyphs */
  close: P('M6 6l12 12') + P('M18 6L6 18'),
  star: P('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'),
  'chevron-right': P('M9 5.5l6.5 6.5L9 18.5'),
  'chevron-down': P('M5.5 9l6.5 6.5L18.5 9'),
  export: P('M12 3v12') + P('M7 10l5 5 5-5') + P('M4 21h16'),
  save: P('M4 4h13l3 3v13H4z') + P('M8 4v5h7V4') + P('M8 20v-6h8v6'),
  codex: P('M4 4.5h6.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 0-1.5-1.5H4z') + P('M20 4.5h-6.5A1.5 1.5 0 0 0 12 6v14a1.5 1.5 0 0 1 1.5-1.5H20z'),
  scan: P('M3 7.5V3h4.5') + P('M16.5 3H21v4.5') + P('M21 16.5V21h-4.5') + P('M7.5 21H3v-4.5') + P('M6.5 12h11'),
  transmit: C(12, 10, 1.6) + P('M8.2 6.2a5.4 5.4 0 0 0 0 7.6') + P('M15.8 6.2a5.4 5.4 0 0 1 0 7.6') + P('M5.4 3.4a9.4 9.4 0 0 0 0 13.2') + P('M18.6 3.4a9.4 9.4 0 0 1 0 13.2') + P('M12 12v9'),
  hud: P('M3 5h18v14H3z') + P('M3 9h18') + P('M7 13h4') + P('M7 16h7')
};

export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

/**
 * Returns an inline technical SVG glyph string.
 * @param {string} name  Icon key (see ICON_NAMES).
 * @param {string} className  CSS class list for the <svg> element.
 */
export function svgIcon(name, className = 'gi') {
  const body = ICONS[name] || ICONS.target;
  const cls = `${className || 'gi'} gi-${name}`.trim();
  return `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Row of filled / hollow star glyphs for ratings. */
export function svgStars(lit = 0, total = 3) {
  return Array.from({ length: total }, (_, i) => svgIcon('star', `gi gi-rate ${i < lit ? 'is-lit' : ''}`)).join('');
}

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Strips emoji, dingbats, and pictographic symbols from untrusted copy. */
export function stripEmoji(text) {
  return String(text ?? '').replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
}

/** Replaces every static `<i data-gi="name">` placeholder with its inline SVG glyph. */
export function hydrateIcons(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('i[data-gi]').forEach((el) => {
    const extra = el.className ? ` ${el.className}` : '';
    el.outerHTML = svgIcon(el.dataset.gi, `gi${extra}`);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrateIcons());
  else hydrateIcons();
}

/* GoSpace — Custom 24x24 duotone space glyphs (zero emoji UI).
   Stroke outlines + soft ".d" tone fills (styled in css/base.css),
   ".f" for solid accents like stars, satellites and beacons. */

const P = (d) => `<path d="${d}"/>`;
const D = (d) => `<path class="d" d="${d}"/>`;
const F = (d) => `<path class="f" d="${d}"/>`;
const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const CD = (cx, cy, r) => `<circle class="d" cx="${cx}" cy="${cy}" r="${r}"/>`;
const CF = (cx, cy, r) => `<circle class="f" cx="${cx}" cy="${cy}" r="${r}"/>`;
const E = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`;

const STAR5 = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.1L12 16.85l-5.5 2.9 1.05-6.1L3.1 9.3l6.15-.9z';
const SPARK = (x, y, s) => `M${x} ${y - s}l${s * 0.32} ${s * 0.68} ${s * 0.68} ${s * 0.32}-${s * 0.68} ${s * 0.32}-${s * 0.32} ${s * 0.68}-${s * 0.32}-${s * 0.68}-${s * 0.68}-${s * 0.32} ${s * 0.68}-${s * 0.32}z`;

const ICONS = {
  /* Stages & navigation */
  // Domed orbital hangar with airlock door and beacon mast
  hangar: D('M3 20a9 8.5 0 0 1 18 0z') + P('M3 20a9 8.5 0 0 1 18 0') + P('M2 20h20') + P('M9.5 20v-4a2.5 2.5 0 0 1 5 0v4') + P('M12 11.5V9') + CF(12, 8, 1.1) + P('M6.2 14.2h1.6') + P('M16.2 14.2h1.6'),
  // Rocket standing beside its gantry tower
  launchpad: P('M3 21h18') + P('M6 21V5') + P('M6 8.5h3.2') + P('M6 12.5h3.2') + D('M15.5 3.5c2 1.7 2.9 4.2 2.9 6.9V17h-5.8v-6.6c0-2.7.9-5.2 2.9-6.9z') + P('M15.5 3.5c2 1.7 2.9 4.2 2.9 6.9V17h-5.8v-6.6c0-2.7.9-5.2 2.9-6.9z') + C(15.5, 9.5, 1.1) + P('M14.4 19.2l1.1 1.8 1.1-1.8'),
  // Ringed planet with an orbiting satellite
  orbit: CD(12, 12, 4.4) + C(12, 12, 4.4) + E(12, 12, 10.2, 3.8, -22) + CF(20.4, 7.4, 1.35),
  // Mission medal: ribbon tails + star disc
  debrief: P('M8.2 2.8l2.6 6') + P('M15.8 2.8l-2.6 6') + CD(12, 14.6, 6.4) + C(12, 14.6, 6.4) + F('M12 10.9l1.15 2.35 2.6.38-1.88 1.83.44 2.58L12 16.83l-2.31 1.21.44-2.58-1.88-1.83 2.6-.38z'),
  // Airlock hatch with exit arrow
  quit: D('M5 4.5h8v15H5z') + P('M13 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h7') + P('M10 12h10') + P('M16.5 8.5L20 12l-3.5 3.5'),
  play: D('M7 4.5l12 7.5-12 7.5z') + P('M7 4.5l12 7.5-12 7.5z'),
  pause: P('M8 5v14') + P('M16 5v14'),
  // Warp: stacked chevrons streaking into a lightspeed bar
  warp: P('M4 6l5 6-5 6') + P('M10.5 6l5 6-5 6') + P('M19.5 5v14') + CF(19.5, 12, 1),
  skip: D('M5.5 5l9 7-9 7z') + P('M5.5 5l9 7-9 7z') + P('M18.5 5v14'),
  // Astronaut helmet with question visor
  help: CD(12, 12, 9) + C(12, 12, 9) + P('M9.4 9.6a2.6 2.6 0 0 1 5.2 0c0 1.9-2.6 2.1-2.6 4.1') + CF(12, 17, 1),
  'music-on': P('M9 18V5.5l11-2.2V16') + CD(6, 18, 3) + C(6, 18, 3) + CD(17, 16, 3) + C(17, 16, 3),
  'music-off': P('M9 18V5.5l11-2.2V16') + C(6, 18, 3) + C(17, 16, 3) + P('M3 3l18 18'),
  'sfx-on': D('M4 9h4l5-4v14l-5-4H4z') + P('M4 9h4l5-4v14l-5-4H4z') + P('M16 9.2a4 4 0 0 1 0 5.6') + P('M18.6 6.6a7.6 7.6 0 0 1 0 10.8'),
  'sfx-off': P('M4 9h4l5-4v14l-5-4H4z') + P('M16.5 9.5l5 5') + P('M21.5 9.5l-5 5'),
  restart: P('M4.5 12a7.5 7.5 0 1 0 2.2-5.3') + P('M4.5 4v4.5H9'),
  // Home planet with a planted flag
  home: CD(12, 15.5, 6) + C(12, 15.5, 6) + P('M7.5 13.6c2.2.9 6.8.9 9 0') + P('M12 9.5V2.8') + D('M12 3h5.2l-1.6 1.9 1.6 1.9H12z') + P('M12 3h5.2l-1.6 1.9 1.6 1.9H12'),

  /* Spacecraft, gauges & subsystems */
  // Flag planted on a planet's curve
  goal: P('M6.5 20V3.5') + D('M6.5 4h11l-2.6 3.6 2.6 3.6h-11z') + P('M6.5 4h11l-2.6 3.6 2.6 3.6h-11') + P('M2.5 21.2c5.6-2.6 13.4-2.6 19 0'),
  // Satellite: bus, two solar wings, antenna mast
  spacecraft: D('M2.5 9.8h5v4.4h-5z') + P('M2.5 9.8h5v4.4h-5z') + D('M16.5 9.8h5v4.4h-5z') + P('M16.5 9.8h5v4.4h-5z') + P('M5 9.8v4.4') + P('M19 9.8v4.4') + P('M7.5 12h2') + P('M14.5 12h2') + P('M9.5 9.5h5v5h-5z') + P('M12 9.5V6.5') + CF(12, 5.4, 1.2) + P('M10.6 17.2a2 2 0 0 0 2.8 0'),
  rocket: D('M12 2.5c2.9 2.4 4 5.8 4 9.5v4.5H8V12c0-3.7 1.1-7.1 4-9.5z') + P('M12 2.5c2.9 2.4 4 5.8 4 9.5v4.5H8V12c0-3.7 1.1-7.1 4-9.5z') + P('M8 12.5l-3 3V20l3-2') + P('M16 12.5l3 3V20l-3-2') + C(12, 9, 1.6) + P('M10.6 19l1.4 2.5 1.4-2.5'),
  // Deep-space dish with signal arcs
  antenna: D('M4.5 10.5a7.5 7.5 0 0 0 9 9z') + P('M4.5 10.5a7.5 7.5 0 0 0 9 9z') + P('M9 15l5-5') + CF(14.6, 9.4, 1.1) + P('M16.8 6.8a3.8 3.8 0 0 1 .4 4.4') + P('M18.9 4.2a7.2 7.2 0 0 1 .9 8.4') + P('M16.5 21h-7'),
  // Nebula sparkle: one big four-point star and two little ones
  autobuild: D(SPARK(11, 11.5, 8.5)) + P(SPARK(11, 11.5, 8.5)) + F(SPARK(19, 4.6, 2.4)) + F(SPARK(19.2, 18.6, 1.8)),
  manifest: D('M5 3.5h14v17H5z') + P('M5 3.5h14v17H5z') + P('M8 8l1 1 2-2') + P('M13 8h3') + P('M8 12.5l1 1 2-2') + P('M13 12.5h3') + P('M8 17h8'),
  // Space credit: coin stamped with a star
  budget: CD(12, 12, 9) + C(12, 12, 9) + C(12, 12, 6.4) + F('M12 8.1l1.15 2.35 2.6.38-1.88 1.83.44 2.58L12 14.03l-2.31 1.21.44-2.58-1.88-1.83 2.6-.38z'),
  mass: D('M7 8.5h10l3 12.5H4z') + P('M7 8.5h10l3 12.5H4z') + C(12, 5.5, 2.5) + P('M10 15h4'),
  power: D('M13.5 2L5 14h6.2l-1 8L19 10h-6.2z') + P('M13.5 2L5 14h6.2l-1 8L19 10h-6.2z'),
  // Downlink: radio waves rising from a ground node
  data: P('M4 20v-3') + P('M8.5 20v-6') + P('M13 20v-9') + P('M17.5 20V7.5') + CF(17.5, 4.6, 1.3) + P('M20.4 2.8a4 4 0 0 1 0 3.6'),
  lifetime: P('M6 3h12') + P('M6 21h12') + D('M7.5 3.5L12 12l-4.5 8.5h9L12 12l4.5-8.5z') + P('M7.5 3v3.2L12 12l-4.5 5.8V21') + P('M16.5 3v3.2L12 12l4.5 5.8V21'),
  // Atom: nucleus with three electron orbits
  science: CF(12, 12, 1.8) + E(12, 12, 9.4, 3.6, 0) + E(12, 12, 9.4, 3.6, 60) + E(12, 12, 9.4, 3.6, 120),
  hull: D('M12 3l8 3v6c0 4.9-3.4 8-8 9-4.6-1-8-4.1-8-9V6z') + P('M12 3l8 3v6c0 4.9-3.4 8-8 9-4.6-1-8-4.1-8-9V6z') + F('M12 7.8l1.05 2.15 2.37.35-1.71 1.67.4 2.36L12 13.2l-2.11 1.13.4-2.36-1.71-1.67 2.37-.35z'),
  battery: P('M3 8h16v8H3z') + D('M5 10h4v4H5z') + D('M10 10h4v4h-4z') + P('M21 10.5v3'),
  // Telescope eye: lens barrel with aperture glint
  camera: D('M3 7.5h4L9 4.5h6l2 3h4V20H3z') + P('M3 7.5h4L9 4.5h6l2 3h4V20H3z') + C(12, 13.5, 3.8) + CF(13.4, 12.2, 1),
  rotate: P('M19.5 12a7.5 7.5 0 1 1-2.2-5.3') + P('M19.5 4v4.5H15') + CF(12, 12, 1.4),
  explode: D('M9 9h6v6H9z') + P('M9 9h6v6H9z') + P('M3.5 3.5L7 7') + P('M20.5 3.5L17 7') + P('M3.5 20.5L7 17') + P('M20.5 20.5L17 17'),
  target: CD(12, 12, 7) + C(12, 12, 7) + P('M12 2v4') + P('M12 18v4') + P('M2 12h4') + P('M18 12h4') + CF(12, 12, 1.5),
  warning: D('M12 3l10 18H2z') + P('M12 3l10 18H2z') + P('M12 9.5v5') + CF(12, 17.6, 1),
  check: P('M4 12.5l5 5L20 6.5'),
  lock: D('M5 11h14v10H5z') + P('M5 11h14v10H5z') + P('M8 11V7.5a4 4 0 0 1 8 0V11') + P('M12 14.5v3'),

  /* Supporting glyphs */
  close: P('M6 6l12 12') + P('M18 6L6 18'),
  star: D(STAR5) + P(STAR5),
  'chevron-right': P('M9 5.5l6.5 6.5L9 18.5'),
  'chevron-down': P('M5.5 9l6.5 6.5L18.5 9'),
  export: P('M12 3v12') + P('M7 10l5 5 5-5') + P('M4 21h16'),
  save: D('M4 4h13l3 3v13H4z') + P('M4 4h13l3 3v13H4z') + P('M8 4v5h7V4') + P('M8 20v-6h8v6'),
  codex: D('M4 4.5h6.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 0-1.5-1.5H4z') + P('M4 4.5h6.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 0-1.5-1.5H4z') + P('M20 4.5h-6.5A1.5 1.5 0 0 0 12 6v14a1.5 1.5 0 0 1 1.5-1.5H20z'),
  // Radar sweep with a blip
  scan: C(12, 12, 9) + D('M12 12V3a9 9 0 0 1 7.8 4.5z') + P('M12 12l7.8-4.5') + C(12, 12, 4.5) + CF(15.8, 15.2, 1.2),
  transmit: CF(12, 10, 1.7) + P('M8.2 6.2a5.4 5.4 0 0 0 0 7.6') + P('M15.8 6.2a5.4 5.4 0 0 1 0 7.6') + P('M5.4 3.4a9.4 9.4 0 0 0 0 13.2') + P('M18.6 3.4a9.4 9.4 0 0 1 0 13.2') + P('M12 12v9'),
  // Helmet visor display
  hud: D('M3 6.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V14a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z') + P('M3 6.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V14a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z') + P('M7 9h10') + P('M7 13h5')
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
  return `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
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

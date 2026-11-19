/**
 * ICONES — jeu d'icônes vectorielles maison.
 *
 * Un seul système, une seule épaisseur de trait (1.75), une seule grille
 * (24x24), aucune dépendance externe : le jeu fonctionne hors connexion.
 * Chaque icône est un tracé SVG inline ; `icon()` renvoie la chaîne SVG.
 */

const PATHS = {
  /* --- Navigation --- */
  home: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V9.5"/>',
  package: '<path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  'package-open': '<path d="m12 13.5-8.7-5"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m14 18 3.5 2 4.5-2.6V8l-4.6 2.6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m4 12 5.5 5.5L20 7"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',

  /* --- Localisation --- */
  'map-pin': '<path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  navigation: '<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
  'map-pin-off': '<path d="M12 22s8-6.5 8-12a8 8 0 0 0-12.7-6.5"/><path d="M9.9 5.2A8 8 0 0 1 20 10c0 1.8-.6 3.6-1.4 5.2"/><path d="m2 2 20 20"/>',
  locate: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',

  /* --- Services --- */
  'shopping-basket': '<path d="M3 9h18l-1.6 10.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z"/><path d="m8 9 3-5M16 9l-3-5"/><path d="M9.5 13v4M14.5 13v4"/>',
  'file-text': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  utensils: '<path d="M7 3v8a2 2 0 0 0 4 0V3"/><path d="M9 11v10"/><path d="M17 3c-1.5 1-2.5 3-2.5 5.5S16 13 18 13v8"/>',
  box: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'glass-water': '<path d="M6 3h12l-1.4 6.2a3 3 0 0 1-2.6 2.3h-4a3 3 0 0 1-2.6-2.3L6 3Z"/><path d="M6 13h12M8 17h8M10 21h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',

  /* --- Véhicules --- */
  motorcycle: '<circle cx="5" cy="17.5" r="3.2"/><circle cx="19" cy="17.5" r="3.2"/><path d="M5 17.5 10 8h4.5M10 8h4.5l3 9.5M11 8 13 4.5h4M9 12.5h5.5M16 11.5h2.5"/>',
  tricycle: '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M5 18 8 8h8l3 10M8 8h5"/><path d="M13 8V4h4"/>',
  car: '<path d="M5 17h14M4 17v-4l2-5h12l2 5v4"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/><path d="M4 13h16"/>',
  van: '<path d="M3 17V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v10"/><path d="M14 9h4l3 4v4h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  truck: '<path d="M2 17V6h11v11M13 9h5l4 4v4h-9"/><circle cx="6.5" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  weight: '<path d="M6.5 7h11l2 13h-15l2-13Z"/><path d="M9 7a3 3 0 1 1 6 0"/><path d="M12 10v3"/>',

  /* --- Options / services --- */
  thermometer: '<path d="M12 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z"/><path d="M14 8v7"/>',
  'thermometer-snowflake': '<path d="M12 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z"/><path d="M14 8v7"/><path d="M8 4v6M6 6l4 4M10 6l-4 4"/>',
  hand: '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11m0-.5V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7h-1a6 6 0 0 1-5.3-3.2L4 13a1.6 1.6 0 0 1 2.7-1.7L8 13"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.6c2.2.7 3.5 2.4 3.5 5.4"/>',
  'user-plus': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5 1.2 0 2.3.2 3.2.6"/><path d="M18 14v6M15 17h6"/>',
  'cloud-rain': '<path d="M17.5 17a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.6A3.8 3.8 0 0 0 7 17"/><path d="M9 20v1M13 20v1M17 20v1"/>',
  shield: '<path d="M12 22s8-3.6 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.4 12 22 12 22Z"/><path d="m9 12 2 2 4-4"/>',
  shieldCheck: '<path d="M12 22s8-3.6 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.4 12 22 12 22Z"/><path d="m9 12 2 2 4-4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6 15h4"/>',
  wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2"/><rect x="3" y="7.5" width="18" height="12" rx="2.5"/><circle cx="16.5" cy="13.5" r="1.3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v4M18 10v4"/>',
  tag: '<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a1.6 1.6 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  percent: '<path d="m5 19 14-14"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  phone: '<path d="M6.5 3h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z"/>',
  message: '<path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M10.3 3.9 2 18.2A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  language: '<path d="M3 5h10M9 3v2c0 4.5-2.5 8-6 10"/><path d="M6 10c1.5 2.5 4 4.5 7 5.5"/><path d="m13 21 4.5-11L22 21M14.8 17h5.4"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 16-5-5-8 9"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
  wallet2: '<path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 8v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M20 10h-4a2 2 0 0 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z"/>',
  logout2: '<path d="M16 17l5-5-5-5M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
  sparkles: '<path d="m12 3 1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  share: '<circle cx="18" cy="5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="19" r="2.8"/><path d="m8.6 10.6 6.8-4M8.6 13.4l6.8 4"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2ZM20 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  users2: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H14a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h5.5"/>',
};

/**
 * Rend une icône SVG.
 * @param {string} name  clé du jeu d'icônes
 * @param {{size?:number, stroke?:number, cls?:string, fill?:boolean}} opts
 * @returns {string} balise SVG
 */
export function icon(name, opts = {}) {
  const { size = 20, stroke = 1.75, cls = '', fill = false } = opts;
  const path = PATHS[name];
  if (!path) {
    console.warn(`Icône inconnue : ${name}`);
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${path}</svg>`;
}

/** Vérifie qu'une icône existe. */
export function hasIcon(name) {
  return Boolean(PATHS[name]);
}

/**
 * Illustration vectorielle d'un véhicule, dessinée dans le même style
 * (trait 1.75, grille 24x24) que le reste du jeu d'icônes.
 * @param {'moto'|'tricycle'|'voiture'|'camionnette'} type
 * @param {number} size
 */
export function vehicleIllustration(type, size = 56) {
  const drawings = {
    moto: `
      <circle cx="4.5" cy="17.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="19.5" cy="17.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M4.5 17.5 8.5 11h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12.5 11 15 6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M15 6.5h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12.5 11 16.5 17.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="10" cy="15" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 11h4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `,
    tricycle: `
      <circle cx="4" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="20" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <path d="M4 17.5 7.5 8h9l1.5 9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7.5 8h5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M13 8V4.5h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 11.5h9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M16.5 11.5v6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `,
    voiture: `
      <path d="M3.5 16.5v-4l2-5h13l2 5v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3.5 12.5h17" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="7" cy="16.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="17" cy="16.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
    `,
    camionnette: `
      <path d="M2.5 16.5V6h10.5v10.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M13 9h4.5L21 13v3.5h-8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="6.5" cy="16.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="17" cy="16.5" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
    `,
  };
  const body = drawings[type] || drawings.moto;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="vehicle-illustration" aria-hidden="true">${body}</svg>`;
}

export default { icon, hasIcon, vehicleIllustration };

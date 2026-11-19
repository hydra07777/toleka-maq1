/**
 * BRAND — rendu du logo TOLEKA en SVG inline.
 *
 * Les tracés viennent de js/brand-paths.js, généré par
 * tools/extract-brand.py depuis assets/logo/logo toleka.pdf.
 *
 * On embarque les tracés plutôt que d'utiliser <img> pour deux raisons :
 *   - la couleur se pilote par CSS (currentColor, var(--brand-300)) ;
 *   - le logo reste net sur tous les écrans, sans dépendance réseau.
 *
 * STRUCTURE DU LOGO
 * -----------------
 * Sur la planche 20 du PDF, le texte est « OLEKA » : le « T » de TOLEKA
 * est la marque cyan elle-même, posée juste avant le mot. Le lockup est
 * donc [marque][OLEKA], avec « Delivery » en Montserrat Light Italic
 * en dessous. Les positions sont reprises telles quelles du PDF.
 *
 * Repère : les tracés sont en y-vers-le-haut (comme le PDF). Chaque rendu
 * applique `scale(1 -1)` pour retomber dans le repère SVG.
 */

import {
  BRAND,
  LOCKUP_MARK,
  LOCKUP_WORD,
  LOCKUP_SUBTITLE,
  LOCKUP_BOX,
  MARK_PATH,
  MARK_BOX,
} from './brand-paths.js';

export { BRAND };

/* ------------------------------------------------------------------ */
/* Boîtes d'emprise                                                    */
/* ------------------------------------------------------------------ */

const LOCK_X0 = LOCKUP_BOX[0];
const LOCK_Y1 = LOCKUP_BOX[3];
const LOCK_W = LOCKUP_BOX[2] - LOCKUP_BOX[0];
const LOCK_H = LOCKUP_BOX[3] - LOCKUP_BOX[1];

const MARK_X0 = MARK_BOX[0];
const MARK_Y1 = MARK_BOX[3];
const MARK_W = MARK_BOX[2] - MARK_BOX[0];
const MARK_H = MARK_BOX[3] - MARK_BOX[1];

/* ------------------------------------------------------------------ */
/* Le lockup complet : [marque] OLEKA + Delivery                        */
/* ------------------------------------------------------------------ */

/**
 * @param {number} height   hauteur totale en px (le lockup est mis à l'échelle)
 * @param {object} opts
 *   - markColor  couleur de la marque (défaut : cyan de marque)
 *   - textColor  couleur du texte (défaut : encre)
 *   - subtitle   afficher « Delivery » (défaut : true)
 */
export function brandLogo(height = 28, opts = {}) {
  const {
    markColor = 'var(--brand-300)',
    textColor = 'var(--ink-900)',
    subtitle = true,
  } = opts;

  const k = height / LOCK_H;
  const width = LOCK_W * k;

  // Le PDF compose « OLEKA » + « Delivery » : on regroupe les deux dans
  // un seul chemin pour garder la position relative d'origine.
  const textPaths = subtitle ? [...LOCKUP_WORD, ...LOCKUP_SUBTITLE] : LOCKUP_WORD;

  const paths = [
    `<path fill="${markColor}" d="${LOCKUP_MARK}" transform="${lockTf()}"/>`,
    ...textPaths.map(
      (d) => `<path fill="${textColor}" d="${d}" transform="${lockTf()}"/>`
    ),
  ].join('');

  return `<svg class="brand-logo" xmlns="http://www.w3.org/2000/svg" width="${r(width)}" height="${r(height)}" viewBox="0 0 ${r(LOCK_W)} ${r(LOCK_H)}" role="img" aria-label="TOLEKA Delivery">
  <title>TOLEKA Delivery</title>
  ${paths}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* La marque seule (le « T-flèche »)                                    */
/* ------------------------------------------------------------------ */

/**
 * @param {number} size  hauteur en px
 */
export function brandMark(size = 32, opts = {}) {
  const { color = 'var(--brand-300)' } = opts;
  return `<svg class="brand-mark" xmlns="http://www.w3.org/2000/svg" width="${r(MARK_W * size / MARK_H)}" height="${size}" viewBox="0 0 ${r(MARK_W)} ${r(MARK_H)}" role="img" aria-label="TOLEKA">
  <title>TOLEKA</title>
  <path fill="${color}" d="${MARK_PATH}" transform="translate(${r(-MARK_X0)} ${r(MARK_Y1)}) scale(1 -1)"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Icône d'app : disque dégradé + marque blanche                       */
/* ------------------------------------------------------------------ */

export function brandIcon(size = 40, opts = {}) {
  const { from = 'var(--brand-300)', to = 'var(--brand-600)' } = opts;
  const id = `tlkGrad${r(Math.random() * 1e6)}`;
  const scale = 0.62;
  const tx = (240 - MARK_W * scale) / 2 - MARK_X0 * scale;
  const ty = (240 - MARK_H * scale) / 2 + MARK_Y1 * scale;
  return `<svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240" role="img" aria-label="TOLEKA">
  <title>TOLEKA</title>
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <circle cx="120" cy="120" r="120" fill="url(#${id})"/>
  <path fill="#FFFFFF" d="${MARK_PATH}" transform="translate(${r(tx)} ${r(ty)}) scale(${scale} ${-scale})"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */

/** Transformation commune : repère PDF (y vers le haut) -> repère SVG. */
function lockTf() {
  return `translate(${r(-LOCK_X0)} ${r(LOCK_Y1)}) scale(1 -1)`;
}

function r(v) {
  return Math.round(v * 1000) / 1000;
}

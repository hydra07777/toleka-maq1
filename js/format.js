/**
 * FORMAT — formatage des montants, numéros de téléphone, dates, distances.
 * Fonctions pures, testables, sans accès au DOM.
 */

import CONFIG from '../config/app.config.js';

/* ------------------------------------------------------------------ */
/* Devises                                                             */
/* ------------------------------------------------------------------ */

/** Devise active (CDF ou USD) — pilotée par le store. */
let activeCurrency = CONFIG.currency.default;

/** Change la devise active et notifie les abonnés. */
export function setCurrency(code) {
  if (!CONFIG.currency.available.includes(code)) return activeCurrency;
  activeCurrency = code;
  window.dispatchEvent(new CustomEvent('currency:changed', { detail: code }));
  return activeCurrency;
}

export function getCurrency() {
  return activeCurrency;
}

/**
 * Convertit un montant CDF vers la devise active.
 * @param {number} cdf
 */
export function convert(cdf) {
  const rate = CONFIG.currency.rates[activeCurrency] ?? 1;
  return cdf / rate;
}

/**
 * Formate un montant CDF dans la devise active.
 * @param {number} cdf
 * @param {{ withUnit?: boolean }} opts
 * @returns {string}
 */
export function money(cdf, opts = {}) {
  const { withUnit = true } = opts;
  const value = convert(cdf);
  const text = CONFIG.currency.format[activeCurrency](value);
  return withUnit ? text : text.replace(/\s?(CDF|\$)/g, '').trim();
}

/** Devise affichée seule (« CDF » ou « $ »). */
export function currencyUnit() {
  return activeCurrency === 'USD' ? '$' : 'CDF';
}

/* ------------------------------------------------------------------ */
/* Téléphones                                                          */
/* ------------------------------------------------------------------ */

/**
 * Formate un numéro congolais : +243 8XX XXX XXX
 * @param {string} raw
 */
export function phone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const local = digits.startsWith('243') ? digits.slice(3) : digits;
  if (local.length < 9) return CONFIG.app.phonePrefix + ' ' + local;
  return (
    CONFIG.app.phonePrefix +
    ' ' +
    local.slice(0, 3) +
    ' ' +
    local.slice(3, 6) +
    ' ' +
    local.slice(6, 9)
  );
}

/** Découpe un numéro en 3 blocs (2/3/4) pour la saisie. */
export function phoneBlocks(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)];
}

/* ------------------------------------------------------------------ */
/* Distance & durée                                                    */
/* ------------------------------------------------------------------ */

/** Distance en kilomètres, 1 décimale. */
export function km(value) {
  return `${value.toFixed(1)} km`;
}

/** Durée en minutes : « 7 min », « 1 h 15 ». */
export function minutes(value) {
  const m = Math.round(value);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest}` : `${h} h`;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « 17 nov. 2026 » */
export function dateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** « lundi 17 novembre » */
export function dateLong(iso) {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'long' })}`;
}

/** « 14:35 » */
export function time(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** « il y a 2 h » */
export function relative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  return dateShort(iso);
}

/* ------------------------------------------------------------------ */
/* Pluriels                                                            */
/* ------------------------------------------------------------------ */

/** « 1 colis » / « 3 colis » */
export function plural(count, singular, plural_) {
  return `${count} ${count > 1 ? plural_ : singular}`;
}

/* ------------------------------------------------------------------ */
/* Plaque d'immatriculation                                            */
/* ------------------------------------------------------------------ */

/** Formate une plaque congolaise : « kt4821a » → « KT 4821 A ». */
export function plate(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/^([A-Z]{1,3})(\d{1,4})([A-Z]{0,2})$/);
  if (!m) return String(raw || '').toUpperCase();
  return `${m[1]} ${m[2]}${m[3] ? ' ' + m[3] : ''}`;
}

/* ------------------------------------------------------------------ */
/* Échappement HTML                                                     */
/* ------------------------------------------------------------------ */

/**
 * Échappe une chaîne pour insertion dans innerHTML.
 * Toute donnée saisie par l'utilisateur passe par ici.
 */
export function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

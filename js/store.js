/**
 * STORE — état global de l'application + persistance localStorage.
 *
 * Toutes les lectures/écritures localStorage sont encapsulées dans des
 * try/catch : en navigation privée ou en file:// strict, le stockage peut
 * échouer sans casser l'application.
 */

import { SAMPLE_ORDERS } from '../data/orders.js';
import { getCurrency, setCurrency } from './format.js';

const STORAGE_KEY = 'delivery-express-state-v1';

/** État initial. */
function initialState() {
  return {
    /* Session */
    isAuthenticated: false,
    phone: '',
    // 'client' | 'livreur' — on ne restaure le mode livreur que si
    // l'inscription a été faite (sinon l'app démarre sur un écran vide).
    mode: 'client',
    currency: getCurrency(),

    /* Commande en cours de création */
    draft: {
      service: 'colis',
      pickup: null,      // { name, lat, lon, street, contactName, contactPhone }
      dropoff: null,
      extraStops: [],
      packageType: 'petit-colis',
      weightKg: 1,
      volume: 'light',
      fragile: false,
      note: '',
      photo: null,
      vehicleId: 'moto',
      vehicleOptions: [],
      scheduled: false,
      scheduledAt: null,
      helpLoad: false,
      secondPerson: false,
      payOnDelivery: false,
      insurance: false,
      promoCode: '',
      paymentMethod: 'm-pesa',
    },

    /* Commande active en suivi */
    activeOrder: null,

    /* Historique */
    orders: [...SAMPLE_ORDERS],

    /* Livreur */
    driver: {
      isOnline: false,
      signupComplete: false,
      profile: null,   // { name, phone, vehicle, plate, ... }
      earningsToday: 0,
      earningsWeek: 0,
      trips: [],
    },

    /* Interface */
    onboarded: false,
    lastTab: 'home',
  };
}

let state = initialState();
const listeners = new Set();

/* ------------------------------------------------------------------ */
/* Persistance                                                         */
/* ------------------------------------------------------------------ */

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Stockage indisponible : l'application continue en mémoire
    console.warn('Persistance impossible :', e.message);
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return;
    // Fusion superficielle : on garde la structure actuelle et on écrase
    // les sections présentes dans la sauvegarde.
    state = { ...state, ...saved, draft: { ...state.draft, ...(saved.draft || {}) } };
  } catch (e) {
    console.warn('Restauration impossible :', e.message);
  }
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/** Lit l'état courant (lecture seule). */
export function getState() {
  return state;
}

/** S'abonner aux changements d'état. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Met à jour l'état et notifie les abonnés.
 * @param {object|((s:object)=>object)} patch
 */
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  persist();
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error('Erreur de listener :', e);
    }
  });
}

/** Met à jour la commande en cours (draft). */
export function updateDraft(patch) {
  setState((s) => ({ draft: { ...s.draft, ...patch } }));
}

/** Ajoute une commande à l'historique. */
export function addOrder(order) {
  setState((s) => ({ orders: [order, ...s.orders] }));
}

/** Met à jour une commande dans l'historique. */
export function updateOrder(id, patch) {
  setState((s) => ({
    orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  }));
}

/** Change la devise active et la propage. */
export function changeCurrency(code) {
  setCurrency(code);
  setState({ currency: code });
}

/** Remet l'état à zéro (utilisé par « recommencer »). */
export function resetAll() {
  state = initialState();
  persist();
  listeners.forEach((fn) => fn(state));
}

/** Efface uniquement l'historique simulé (garde la session). */
export function clearOrders() {
  setState({ orders: [] });
}

/* ------------------------------------------------------------------ */
/* Initialisation                                                      */
/* ------------------------------------------------------------------ */

restore();

export { STORAGE_KEY };

/**
 * GEO — distance, ETA, trajectoire simulée.
 * Fonctions pures : aucun accès au DOM ni à la carte.
 */

import CONFIG from '../config/app.config.js';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Distance à vol d'oiseau entre deux points, en kilomètres.
 * @param {{lat:number, lon:number}} a
 * @param {{lat:number, lon:number}} b
 */
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Distance Routière ESTIMÉE entre deux points.
 * On applique un facteur de sinuosité : la distance à vol d'oiseau
 * sous-estime toujours le trajet réel, d'autant plus à Kinshasa où
 * le réseau est congestionné et sinueux.
 */
export function roadDistance(a, b) {
  const straight = haversine(a, b);
  const estimated = straight * CONFIG.pricing.distanceSafetyFactor;
  return Math.max(straight, Math.min(estimated, CONFIG.pricing.maxBilledDistanceKm));
}

/**
 * Distance facturée : la distance routière, bornée entre le minimum
 * et le maximum de la config.
 */
export function billedDistance(a, b) {
  const road = roadDistance(a, b);
  return Math.min(Math.max(road, CONFIG.pricing.minDistanceKm), CONFIG.pricing.maxBilledDistanceKm);
}

/**
 * Durée de trajet estimée en minutes (trajet complet, retrait → livraison).
 * @param {number} distanceKm
 * @param {string} vehicleId
 */
export function etaMinutes(distanceKm, vehicleId) {
  const vehicle = CONFIG.timing.etaPerVehicle[vehicleId] ?? 0;
  const base = CONFIG.timing.etaBaseMinutes;
  const perKm = CONFIG.timing.etaPerKmMinutes;
  const congestion = 1.25; // facteur moyen de congestion à Kinshasa
  return Math.max(3, Math.round((base + distanceKm * perKm) * congestion + vehicle));
}

/** Fenêtres d'arrivée annoncées dans les fiches véhicules. */
export const VEHICLE_ETA = {
  moto: [5, 10],
  tricycle: [10, 20],
  voiture: [15, 25],
  camionnette: [25, 40],
};

/**
 * Délai d'ARRIVÉE du livreur sur le point de retrait.
 * C'est une autre mesure que le temps de livraison : le livreur part de
 * sa position, qu'on ne connaît pas — on l'estime à partir de la longueur
 * du trajet demandé. Une course courte = un livreur disponible vite.
 *
 * @param {number} distanceKm longueur totale du trajet demandé
 * @param {string} vehicleId
 */
export function arrivalMinutes(distanceKm, vehicleId) {
  const spec = CONFIG.timing.etaPerVehicle[vehicleId] ?? 0;
  const window = VEHICLE_ETA[vehicleId] || [5, 10];
  const raw = Math.round(4 + distanceKm * 0.9) + spec;
  return Math.min(Math.max(raw, window[0]), 45);
}

/**
 * Interpole un point entre deux coordonnées (t ∈ [0,1]).
 * @returns {{lat:number, lon:number}}
 */
export function lerp(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

/**
 * Génère une trajectoire courbée entre deux points.
 * Un décalage perpendiculaire produit un arc, ce qui ressemble à un
 * trajet suivant une route plutôt qu'une ligne droite.
 * @param {{lat:number, lon:number}} from
 * @param {{lat:number, lon:number}} to
 * @param {number} steps nombre de points
 */
export function buildRoute(from, to, steps = 24) {
  const pts = [];
  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;
  const len = Math.hypot(dx, dy) || 1;
  // normale unitaire au segment (perpendiculaire)
  const nx = -dy / len;
  const ny = dx / len;
  const amplitude = Math.min(len * 0.16, 0.012);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const base = lerp(from, to, t);
    // arc en sin(πt) : maximal au milieu du trajet
    const offset = Math.sin(Math.PI * t) * amplitude;
    pts.push({
      lat: base.lat + ny * offset,
      lon: base.lon + nx * offset,
    });
  }
  return pts;
}

/**
 * Position sur la trajectoire à l'instant t (0 → 1).
 * @param {Array<{lat:number,lon:number}>} route
 * @param {number} t
 */
export function pointAt(route, t) {
  if (!route.length) return null;
  const clamped = Math.min(Math.max(t, 0), 1);
  const idx = clamped * (route.length - 1);
  const i = Math.floor(idx);
  const j = Math.min(i + 1, route.length - 1);
  return lerp(route[i], route[j], idx - i);
}

/**
 * Point de départ du livreur : légèrement décalé du point de retrait,
 * comme s'il arrivait en moto depuis une autre rue.
 */
export function driverStart(pickup) {
  return {
    lat: pickup.lat + 0.0085,
    lon: pickup.lon - 0.0115,
  };
}

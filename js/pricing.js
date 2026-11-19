/**
 * PRICING — calcul du prix d'une course.
 * Fonction pure : entrée → détail du devis. Aucun DOM.
 * C'est ici que se décide le montant affiché au client.
 */

import CONFIG from '../config/app.config.js';
import { billedDistance, etaMinutes } from './geo.js';

/**
 * @typedef {object} QuoteInput
 * @property {{lat:number,lon:number}} pickup
 * @property {{lat:number,lon:number}} dropoff
 * @property {string} vehicleId
 * @property {number} [weightKg]
 * @property {string[]} [options] ids d'options activées
 * @property {boolean} [scheduled]
 * @property {boolean} [peakHour]
 * @property {boolean} [rain]
 * @property {boolean} [insurance]
 * @property {string} [promoCode]
 */

/**
 * Calcule le devis complet.
 * @param {QuoteInput} input
 * @returns {{
 *   vehicleId: string, distanceKm: number, base: number, perKm: number,
 *   distanceCost: number, surcharges: Array<{label:string, amount:number, key:string}>,
 *   insurance: number, discount: number, total: number, minimumApplied: boolean,
 *   etaMinutes: number, promoApplied: boolean, promoError: string|null
 * }}
 */
export function quote(input) {
  const p = CONFIG.pricing;
  const vehicle = p.vehicles[input.vehicleId];
  const distanceKm = billedDistance(input.pickup, input.dropoff);

  const base = vehicle.base;
  const perKm = vehicle.perKm;
  const distanceCost = Math.round(distanceKm * perKm);

  let total = base + distanceCost;

  /* ---- Suppléments ---- */
  const surcharges = [];
  const options = new Set(input.options || []);

  // Suppléments blocés par option du véhicule
  const OPTION_SURCHARGE = {
    isotherme: { label: 'Box isotherme', key: 'isotherme' },
    mainPropre: { label: 'Remise en main propre', key: 'remiseMainPropre' },
    aideChargement: { label: 'Aide au chargement', key: 'aideChargement' },
    bache: { label: 'Bâche de protection', key: 'bache' },
    deuxiemePersonne: { label: '2e personne', key: 'deuxiemePersonne' },
  };

  for (const opt of options) {
    const def = OPTION_SURCHARGE[opt];
    if (def) {
      surcharges.push({ label: def.label, amount: p.surcharges[def.key] || 0, key: def.key });
    }
  }

  // Aide au chargement demandée globalement (option écran)
  if (input.helpLoad && !options.has('aideChargement')) {
    surcharges.push({ label: 'Aide au chargement', amount: p.surcharges.aideChargement, key: 'aideChargement' });
  }

  // Deuxième personne
  if (input.secondPerson && !options.has('deuxiemePersonne')) {
    surcharges.push({ label: '2e personne', amount: p.surcharges.deuxiemePersonne, key: 'deuxiemePersonne' });
  }

  // Heure de pointe
  if (input.peakHour) {
    surcharges.push({ label: 'Heure de pointe', amount: p.surcharges.heurePointe, key: 'heurePointe' });
  }

  // Pluie
  if (input.rain) {
    surcharges.push({ label: 'Conditions pluvieuses', amount: p.surcharges.pluie, key: 'pluie' });
  }

  // Colis volumineux
  if (input.volume === 'large') {
    surcharges.push({ label: 'Colis volumineux', amount: p.surcharges.volume, key: 'volume' });
  }

  // Colis fragile
  if (input.fragile) {
    surcharges.push({ label: 'Colis fragile', amount: p.surcharges.fragile, key: 'fragile' });
  }

  // Longue distance
  if (distanceKm > p.longDistanceThresholdKm) {
    surcharges.push({ label: 'Trajet longue distance', amount: p.surcharges.distanceLongue, key: 'distanceLongue' });
  }

  for (const s of surcharges) total += s.amount;

  /* ---- Assurance colis ---- */
  const insurance = input.insurance ? Math.round(total * 0.05) : 0;
  total += insurance;

  /* ---- Minimum de course ---- */
  let minimumApplied = false;
  if (total < vehicle.min) {
    total = vehicle.min;
    minimumApplied = true;
  }

  /* ---- Code promo ---- */
  let discount = 0;
  let promoApplied = false;
  let promoError = null;
  const code = (input.promoCode || '').trim().toUpperCase();
  if (code) {
    if (code === 'KULUNA10') {
      discount = Math.round(total * 0.1);
      promoApplied = true;
      total -= discount;
    } else if (code === 'BIENVENUE') {
      discount = Math.min(1000, total);
      promoApplied = true;
      total -= discount;
    } else {
      promoError = 'Ce code promo est invalide ou expiré.';
    }
  }

  return {
    vehicleId: input.vehicleId,
    distanceKm,
    base,
    perKm,
    distanceCost,
    surcharges,
    insurance,
    discount,
    promoApplied,
    promoError,
    total: Math.max(0, Math.round(total)),
    minimumApplied,
    etaMinutes: etaMinutes(distanceKm, input.vehicleId),
  };
}

/**
 * Le véhicule convient-il au colis ? Retourne un avertissement ou null.
 * @param {{weightKg:number, volume:string, fragile:boolean}} packageInfo
 * @param {string} vehicleId
 * @returns {{level:'warning'|'info', title:string, text:string, suggestion?:string}|null}
 */
export function vehicleWarning(packageInfo, vehicleId) {
  const p = CONFIG.pricing;
  const v = CONFIG.pricing.vehicles[vehicleId];

  if (packageInfo.weightKg > p.vehicleCapacityKg[vehicleId]) {
    return {
      level: 'warning',
      title: 'Trop lourd pour ce véhicule',
      text: `Ce colis pèse ${packageInfo.weightKg} kg, la capacité maximale est de ${p.vehicleCapacityKg[vehicleId]} kg.`,
      suggestion: vehicleId === 'moto' ? 'tricycle' : 'camionnette',
    };
  }

  if (vehicleId === 'moto') {
    if (packageInfo.weightKg > p.motoWeightLimitKg) {
      return {
        level: 'warning',
        title: 'Colis trop lourd pour une moto',
        text: `Au-delà de ${p.motoWeightLimitKg} kg, un tricycle est plus adapté.`,
        suggestion: 'tricycle',
      };
    }
    if (packageInfo.volume === 'large') {
      return {
        level: 'warning',
        title: 'Colis volumineux',
        text: 'Un gros objet ne tient pas sur une moto, même léger.',
        suggestion: 'tricycle',
      };
    }
  }

  if (vehicleId === 'tricycle' && packageInfo.weightKg > 300) {
    return {
      level: 'warning',
      title: 'Capacité insuffisante',
      text: 'Un tricycle transporte jusqu’à 300 kg.',
      suggestion: 'camionnette',
    };
  }

  void v;
  return null;
}

/**
 * Suggestion de véhicule adaptée au colis.
 * @param {{weightKg:number, volume:string}} packageInfo
 */
export function suggestVehicle(packageInfo) {
  const caps = CONFIG.pricing.vehicleCapacityKg;
  const order = ['moto', 'tricycle', 'voiture', 'camionnette'];

  if (packageInfo.weightKg <= caps.moto && packageInfo.volume !== 'large') return 'moto';
  if (packageInfo.weightKg <= caps.tricycle) return 'tricycle';
  if (packageInfo.weightKg <= caps.voiture) return 'voiture';
  return 'camionnette';
}

/**
 * Distance à partir de laquelle il faut suggérer une voiture/camionnette.
 */
export function needsLongDistanceVehicle(distanceKm) {
  return distanceKm > CONFIG.pricing.longDistanceThresholdKm;
}

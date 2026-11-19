/**
 * TRACKING — machine à états du suivi d'une commande + animation du livreur.
 *
 * La machine est pilotée par un minuteur : chaque étape fait avancer le
 * marqueur du livreur sur la trajectoire et met à jour l'ETA. Tout est
 * simulé, mais le rythme est réaliste.
 */

import CONFIG from '../config/app.config.js';
import { buildRoute, pointAt, driverStart } from './geo.js';
import { moveMarker } from './map.js';

/** Les quatre statuts du suivi, dans l'ordre. */
export const TRACKING_STEPS = [
  { id: 'en_route', label: 'Livreur en route' },
  { id: 'picked', label: 'Colis récupéré' },
  { id: 'delivering', label: 'En livraison' },
  { id: 'delivered', label: 'Livré' },
];

/**
 * Crée un moteur de suivi.
 * @param {object} opts
 * @param {object} opts.order commande suivie
 * @param {object} opts.map instance Leaflet
 * @param {Function} opts.onUpdate callback (état) à chaque changement
 * @param {Function} [opts.onComplete] callback à la fin
 */
export function createTracker(opts) {
  const { order, map, onUpdate, onComplete } = opts;

  const pickup = order.pickup;
  const dropoff = order.dropoff;
  const origin = driverStart(pickup);

  // Trajet 1 : du point de départ du livreur au point de retrait
  const routeToPickup = buildRoute(origin, pickup, 18);
  // Trajet 2 : du retrait à la livraison
  const routeToDropoff = buildRoute(pickup, dropoff, 26);

  const state = {
    stepIndex: 0,
    progress: 0,        // 0 → 1 sur l'ensemble du trajet
    etaMinutes: order.etaMinutes || 12,
    totalMinutes: order.etaMinutes || 12,
    position: origin,
    running: false,
    timer: null,
  };

  // Répartition du temps : 30 % pour venir au retrait, 70 % pour livrer
  const PICKUP_SHARE = 0.3;

  function currentStep() {
    return TRACKING_STEPS[Math.min(state.stepIndex, TRACKING_STEPS.length - 1)];
  }

  /** Position du livreur selon la progression globale. */
  function positionAt(p) {
    if (p <= PICKUP_SHARE) {
      const t = p / PICKUP_SHARE;
      return { point: pointAt(routeToPickup, t), phase: 'to_pickup' };
    }
    const t = (p - PICKUP_SHARE) / (1 - PICKUP_SHARE);
    return { point: pointAt(routeToDropoff, t), phase: 'to_dropoff' };
  }

  /** Met à jour l'état et notifie l'interface. */
  function emit() {
    onUpdate?.({
      step: currentStep(),
      stepIndex: state.stepIndex,
      progress: state.progress,
      etaMinutes: state.etaMinutes,
      position: state.position,
      totalMinutes: state.totalMinutes,
    });
  }

  /** Un tick de l'animation. */
  function tick() {
    const totalTicks = 60;           // 60 ticks ≈ la durée d'une course
    const perTick = 1 / totalTicks;

    state.progress = Math.min(1, state.progress + perTick);

    const { point } = positionAt(state.progress);
    if (point) {
      state.position = point;
      moveMarker(opts.driverMarker, point.lat, point.lon);
    }

    // Changement de statut
    const newIndex = state.progress < PICKUP_SHARE ? 0 : state.progress < 0.62 ? 1 : state.progress < 1 ? 2 : 3;
    if (newIndex !== state.stepIndex) {
      state.stepIndex = newIndex;
    }

    // ETA dégressif
    const remaining = Math.max(0, Math.round(state.totalMinutes * (1 - state.progress)));
    state.etaMinutes = remaining;

    emit();

    if (state.progress >= 1) {
      stop();
      onComplete?.();
    }
  }

  /** Démarre l'animation. */
  function start() {
    if (state.running) return;
    state.running = true;
    emit();
    state.timer = setInterval(tick, CONFIG.timing.trackingTickMs);
  }

  /** Arrête l'animation. */
  function stop() {
    state.running = false;
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /** Avance manuellement d'un cran (bouton «.step »). */
  function advance() {
    if (state.progress >= 1) return;
    state.progress = Math.min(1, state.progress + 0.22);
    tick();
  }

  /** Force un statut précis (utilisé par le bouton « Livré » du mode livreur). */
  function forceStep(index) {
    state.stepIndex = Math.max(state.stepIndex, index);
    const targetProgress = [0.05, 0.42, 0.7, 1][index] ?? state.progress;
    state.progress = Math.max(state.progress, targetProgress);
    const { point } = positionAt(state.progress);
    if (point) {
      state.position = point;
      moveMarker(opts.driverMarker, point.lat, point.lon);
    }
    emit();
  }

  return {
    state,
    start,
    stop,
    advance,
    forceStep,
    emit,
    routeToPickup,
    routeToDropoff,
    positionAt,
  };
}

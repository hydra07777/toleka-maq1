/**
 * ÉCRANS — Suivi live, recherche de livreur, fin de course, historique, profil.
 */

import CONFIG from '../../config/app.config.js';
import { PLACES } from '../../data/places.js';
import { VEHICLES } from '../../data/vehicles.js';
import { SAVED_ADDRESSES, ORDER_FILTERS } from '../../data/orders.js';
import { matchingDrivers, driverById } from '../../data/drivers.js';
import { icon } from '../icons.js';
import { escape, money, phone as fmtPhone, minutes as fmtMinutes, km as fmtKm, dateShort, time as fmtTime, relative } from '../format.js';
import { getState, setState, updateDraft, addOrder, updateOrder } from '../store.js';
import { $, $$, toast, openSheet, openModal, notice, emptyState, statusStep, lineItem } from '../ui.js';
import { createMap, addMarker, removeMarker, drawRoute, fitBounds, setView, renderFallbackMap, whenReady } from '../map.js';
import { createTracker, TRACKING_STEPS } from '../tracking.js';

/* ------------------------------------------------------------------ */
/* RECHERCHE DE LIVREUR (radar)                                        */
/* ------------------------------------------------------------------ */

export const searchDriverScreen = (app) => ({
  id: 'search-driver',
  hideTabbar: true,
  hideTabbar: true,
  fullBleed: true,
  darkStatusBar: false,

  render() {
    const order = getState().activeOrder;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Annuler la recherche">${icon('x', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Recherche d’un livreur</div>
          <div class="appbar-sub">${escape(order?.pickup?.name || '')}</div>
        </div>
      </header>

      <div class="screen-body" style="display:grid;place-items:center;padding:var(--sp-6)">
        <div class="radar" role="status" aria-live="polite">
          <span class="radar-ring"></span>
          <span class="radar-ring"></span>
          <span class="radar-ring"></span>
          <span class="radar-sweep"></span>
          <span class="radar-core">${icon('motorcycle', { size: 28 })}</span>
        </div>

        <div style="text-align:center;margin-top:var(--sp-6)">
          <h2 id="searchTitle">Recherche en cours…</h2>
          <p class="muted small" style="margin-top:var(--sp-2);max-width:28ch;margin-inline:auto">
            Nous contactons les livreurs disponibles autour de vous.
          </p>
        </div>

        <div id="searchCandidates" class="stack gap-2" style="margin-top:var(--sp-6);width:100%"></div>
      </div>

      <footer class="screen-footer">
        <button class="btn btn-ghost btn-block" id="cancelSearch">Annuler la recherche</button>
      </footer>
    `;
  },

  mount(root) {
    const order = getState().activeOrder;

    // Candidats compatibles avec le véhicule et les options demandées
    const candidates = matchingDrivers({
      vehicleId: order.vehicle,
      weightKg: order.weightKg,
      volume: order.volume,
      requiresHandDelivery: (order.vehicleOptions || []).includes('mainPropre'),
      requiresInsulated: (order.vehicleOptions || []).includes('isotherme'),
      requiresHelpLoad: order.vehicleOptions?.includes('aideChargement') || order.vehicleOptions?.includes('deuxiemePersonne'),
    });

    /* Le livreur proposé doit POUVOIR prendre cette commande. On ne
       propose que ceux qui correspondent, sinon on afficherait un nom
       sans initiale (avatar « ?? ») ou un livreur incompatible. */

    const host = root.querySelector('#searchCandidates');
    const title = root.querySelector('#searchTitle');

    // Affichage progressif des candidats
    candidates.forEach((d, i) => {
      setTimeout(() => {
        if (!document.body.contains(host)) return;
        const node = document.createElement('div');
        node.innerHTML = `
          <div class="card" style="padding:var(--sp-3);display:flex;align-items:center;gap:var(--sp-3);animation:screenFade var(--t-slow) var(--ease-out)">
            <span class="driver-avatar driver-avatar-sm" style="background:${d.color}22;color:${d.color}">${escape(d.initials)}</span>
            <span class="grow">
              <span class="semibold small" style="display:block">${escape(d.name)}</span>
              <span class="xsmall muted">${escape(d.zone)} · ${icon('star', { size: 11 })} ${d.rating}</span>
            </span>
            <span class="small muted">contacté</span>
          </div>`;
        host.appendChild(node);
      }, 700 + i * 600);
    });

    const total = CONFIG.timing.searchSeconds * 1000;
    const found = candidates[0] || null;

    setTimeout(() => {
      if (!document.body.contains(root)) return;
      if (!found) {
        title.textContent = 'Aucun livreur disponible';
        host.innerHTML = notice('warning', 'Pas de livreur pour le moment', 'Réessayez dans quelques minutes ou changez de véhicule.');
        return;
      }
      title.textContent = 'Livreur trouvé !';
      const order2 = { ...getState().activeOrder, driverId: found.id, driverName: found.name };
      setState({ activeOrder: order2 });
      app.router.push('driver-found', { driver: found });
    }, total);

    root.querySelector('#cancelSearch')?.addEventListener('click', () => {
      app.router.back();
    });
  },
});

/* ------------------------------------------------------------------ */
/* LIVREUR TROUVÉ                                                      */
/* ------------------------------------------------------------------ */

export const driverFoundScreen = (app) => ({
  id: 'driver-found',
  fullBleed: true,

  render(params) {
    const d = params.driver;
    const order = getState().activeOrder;

    return `
      <div class="tracking-map" id="foundMap"></div>
      <div class="map-scrim" style="background:linear-gradient(180deg,rgba(255,255,255,0.94) 0%,rgba(255,255,255,0) 28%,rgba(255,255,255,0) 60%,rgba(255,255,255,0.92) 92%)"></div>

      <header class="appbar" style="position:absolute;top:0;left:0;right:0;z-index:25">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Votre livreur</div>
          <div class="appbar-sub">${escape(order?.pickup?.name || '')}</div>
        </div>
      </header>

      <div class="tracking-card tracking-card-top" style="top:auto;bottom:calc(var(--tabbar-h) + var(--sp-4))">
        <div class="driver-card" style="margin-bottom:var(--sp-4)">
          <span class="driver-avatar driver-avatar-lg" style="background:${d.color}22;color:${d.color}">
            ${escape(d.initials)}
            <span class="online-dot"></span>
          </span>
          <span class="grow">
            <span class="between">
              <span class="semibold" style="font-size:var(--fs-h3)">${escape(d.name)}</span>
              <span class="row gap-1 small"><span style="color:#f0a500">${icon('star', { size: 14, fill: true })}</span><span class="semibold">${d.rating}</span></span>
            </span>
            <span class="small muted" style="display:block;margin-top:2px">${escape(d.vehicleName)}</span>
            <span class="row gap-2" style="margin-top:var(--sp-2)">
              <span class="plate">${escape(d.plate)}</span>
              <span class="xsmall muted">${d.completedTrips} courses</span>
            </span>
          </span>
        </div>

        <div class="eta-bar">
          <span class="eta-value" id="etaValue">${order?.etaMinutes ?? 8}</span>
          <span class="eta-label">minutes avant l’arrivée</span>
        </div>

        <div class="row gap-2" style="margin-top:var(--sp-4)">
          <button class="btn btn-secondary grow" id="callBtn">
            ${icon('phone', { size: 18 })} <span>Appeler</span>
          </button>
          <button class="btn btn-secondary grow" id="msgBtn">
            ${icon('message', { size: 18 })} <span>Message</span>
          </button>
        </div>
      </div>
    `;
  },

  async mount(root, params) {
    const d = params.driver;
    const order = getState().activeOrder;

    // Leaflet arrive en réseau : on attend avant de créer la carte.
    await whenReady();
    if (!document.body.contains(root)) return;

    const map = createMap(root.querySelector('#foundMap'));
    if (map) {
      fitBounds(map, [order.pickup, order.dropoff]);
      addMarker(map, order.pickup.lat, order.pickup.lon, 'pick', { size: 'sm' });
      addMarker(map, order.dropoff.lat, order.dropoff.lon, 'dropoff', { size: 'sm' });
    } else {
      renderFallbackMap(root.querySelector('#foundMap'));
    }

    root.querySelector('#callBtn')?.addEventListener('click', () => {
      toast(`Appel vers ${d.name} (simulation)`, { iconName: 'phone' });
    });
    root.querySelector('#msgBtn')?.addEventListener('click', () => {
      toast(`Message envoyé à ${d.name}`, { type: 'success', iconName: 'message' });
    });

    // Passage automatique au suivi après quelques secondes
    setTimeout(() => {
      if (!document.body.contains(root)) return;
      app.router.replace('tracking');
    }, 2600);
  },
});

/* ------------------------------------------------------------------ */
/* SUIVI EN TEMPS RÉEL                                                 */
/* ------------------------------------------------------------------ */

export const trackingScreen = (app) => ({
  id: 'tracking',
  fullBleed: true,

  render() {
    const order = getState().activeOrder;
    const d = order ? driverById(order.driverId) : null;

    return `
      <div class="tracking-map" id="trackMap"></div>
      <div class="map-scrim" style="background:linear-gradient(180deg,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0) 18%,rgba(255,255,255,0) 46%,rgba(255,255,255,0.95) 78%)"></div>

      <header class="appbar home-header" style="position:absolute;top:0;left:0;right:0;z-index:25">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title" id="trackTitle">Livreur en route</div>
          <div class="appbar-sub">${escape(order?.pickup?.name || '')} → ${escape(order?.dropoff?.name || '')}</div>
        </div>
        <button class="icon-btn" id="shareBtn" aria-label="Partager le suivi">${icon('share', { size: 19 })}</button>
      </header>

      <div class="tracking-card tracking-card-top">
        <div class="driver-card">
          <span class="driver-avatar" style="background:${d?.color || '#0E9F6E'}22;color:${d?.color || '#0E9F6E'}">
            ${escape(d?.initials || '??')}
            <span class="online-dot"></span>
          </span>
          <span class="grow">
            <span class="semibold">${escape(order?.driverName || 'Livreur')}</span>
            <span class="small muted" style="display:block">${escape(d?.vehicleName || '')}</span>
          </span>
          <span style="text-align:right">
            <span class="eta-value" id="etaValue" style="font-size:var(--fs-h1)">${order?.etaMinutes ?? 8}</span>
            <span class="xsmall muted" style="display:block">min</span>
          </span>
        </div>
        <div class="eta-progress"><div class="eta-progress-fill" id="etaFill" style="width:0%"></div></div>
      </div>

      <div class="tracking-card" style="bottom:calc(var(--tabbar-h) + var(--sp-4))">
        <ol class="stepper" id="statusStepper">
          ${TRACKING_STEPS.map((s, i) => statusStep({ label: s.label, state: i === 0 ? 'current' : 'todo' })).join('')}
        </ol>

        <div id="codeBlock" style="margin-top:var(--sp-4)">
          <div class="notice notice-info" style="margin-bottom:var(--sp-3)">
            <span class="notice-icon">${icon('ticket', { size: 18 })}</span>
            <span>
              <strong>Code de confirmation</strong><br>
              Demandez ce code au livreur avant de recevoir le colis.
              <div class="confirm-code" style="margin-top:var(--sp-2)">
                ${String(order?.code || '000000')
                  .split('')
                  .map((c) => `<span class="code-cell is-filled">${c}</span>`)
                  .join('')}
              </div>
            </span>
          </div>
        </div>
      </div>
    `;
  },

  async mount(root) {
    const order = getState().activeOrder;
    if (!order) {
      app.router.replace('home');
      return;
    }

    await whenReady();
    if (!document.body.contains(root)) return;

    const map = createMap(root.querySelector('#trackMap'));
    let driverMarker = null;
    let routeLine = null;

    if (map) {
      fitBounds(map, [order.pickup, order.dropoff]);
      addMarker(map, order.pickup.lat, order.pickup.lon, 'pick', { size: 'sm' });
      addMarker(map, order.dropoff.lat, order.dropoff.lon, 'dropoff', { size: 'sm' });
      routeLine = drawRoute(map, [
        { lat: order.pickup.lat, lon: order.pickup.lon },
        { lat: order.dropoff.lat, lon: order.dropoff.lon },
      ], { color: '#0E9F6E', weight: 4, opacity: 0.45, dashArray: '8 8' });
      driverMarker = addMarker(map, order.pickup.lat + 0.008, order.pickup.lon - 0.011, 'driver');
    } else {
      renderFallbackMap(root.querySelector('#trackMap'));
    }

    const tracker = createTracker({
      order,
      map,
      driverMarker,
      onUpdate: (s) => {
        const title = root.querySelector('#trackTitle');
        const eta = root.querySelector('#etaValue');
        const fill = root.querySelector('#etaFill');
        const stepper = root.querySelector('#statusStepper');

        if (title) title.textContent = s.step.label;
        if (eta) eta.textContent = s.etaMinutes;
        if (fill) fill.style.width = `${Math.round(s.progress * 100)}%`;

        if (stepper) {
          const states = TRACKING_STEPS.map((_, i) =>
            i < s.stepIndex ? 'done' : i === s.stepIndex ? 'current' : 'todo'
          );
          const labels = TRACKING_STEPS.map((st, i) =>
            statusStep({
              label: st.label,
              state: states[i],
              time: i === s.stepIndex ? `Dans ${s.etaMinutes} min` : '',
            })
          );
          stepper.innerHTML = labels.join('');
        }

        // Le code apparaît quand le colis est récupéré
        /* Le code de confirmation est affiché DÈS LE DÉBUT : c'est le
           client qui le communique au livreur, il doit donc l'avoir
           sous les yeux avant même que le livreur arrive. */
        const codeBlock = root.querySelector('#codeBlock');
        if (codeBlock) codeBlock.style.display = 'block';

        if (map && driverMarker && s.stepIndex >= 2) {
          setView(map, s.position.lat, s.position.lon);
        }
      },
      onComplete: () => {
        // On passe à l'écran de fin de course
        app.finishTracking(order);
      },
    });

    app.tracker = tracker;
    tracker.start();

    // L'animation est arrêtée si l'écran est quitté (retour, reset).
    this._tracker = tracker;

    root.querySelector('#shareBtn')?.addEventListener('click', () => {
      const link = `https://delivery-express.cd/suivi/${order.id}`;
      const sheet = openSheet({
        title: 'Partager le suivi',
        container: app.phoneEl,
        content: `
          <p class="small muted" style="margin-bottom:var(--sp-3)">Envoyez ce lien à la personne qui suit la commande :</p>
          <div class="row gap-2">
            <input class="input grow" id="shareLink" readonly value="${escape(link)}">
            <button class="btn btn-secondary" id="copyLink">${icon('copy', { size: 18 })}</button>
          </div>
        `,
        footer: `<button class="btn btn-primary btn-block" data-sheet-close2>Fermer</button>`,
      });
      sheet.element.querySelector('#copyLink')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(link);
          toast('Lien copié', { type: 'success', iconName: 'check' });
        } catch (e) {
          toast('Copie impossible', { type: 'error' });
        }
      });
      sheet.element.querySelector('[data-sheet-close2]')?.addEventListener('click', () => sheet.close());
    });
  },

});

/* ------------------------------------------------------------------ */
/* FIN DE COURSE — NOTATION                                             */
/* ------------------------------------------------------------------ */

export const ratingScreen = (app) => ({
  id: 'rating',
  hideTabbar: true,
  hideTabbar: true,

  render() {
    const order = getState().activeOrder;
    const d = order?.driverId ? driverById(order.driverId) : null;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Course livrée</div>
          <div class="appbar-sub">Merci de confirmer la réception</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <!-- Preuve de livraison -->
        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="between">
            <div>
              <div class="semibold">Preuve de livraison</div>
              <div class="small muted">Photo prise à ${fmtTime(new Date().toISOString())}</div>
            </div>
            <span style="display:grid;place-items:center;width:52px;height:52px;border-radius:var(--r-md);background:var(--brand-100);color:var(--brand-700)">
              ${icon('camera', { size: 24 })}
            </span>
          </div>
        </div>

        <!-- Livreur -->
        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="driver-card">
            <span class="driver-avatar" style="background:${d?.color || '#0E9F6E'}22;color:${d?.color || '#0E9F6E'}">${escape(d?.initials || '??')}</span>
            <span class="grow">
              <span class="semibold">${escape(order?.driverName || 'Livreur')}</span>
              <span class="small muted" style="display:block">${escape(d?.vehicleName || '')} · ${escape(d?.plate || '')}</span>
            </span>
            <span class="row gap-1 small"><span style="color:#f0a500">${icon('star', { size: 14, fill: true })}</span><span class="semibold">${d?.rating ?? '—'}</span></span>
          </div>
        </div>

        <!-- Étoiles -->
        <h3 style="margin-bottom:var(--sp-3);text-align:center">Comment s’est passée la course ?</h3>
        <div class="stars" id="stars" role="radiogroup" aria-label="Note sur 5">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) => `
            <button class="star-btn" role="radio" aria-checked="false" data-star="${n}" aria-label="${n} étoile${n > 1 ? 's' : ''}">
              ${icon('star', { size: 28, fill: true })}
            </button>`
            )
            .join('')}
        </div>
        <p class="small muted" id="starLabel" style="text-align:center;margin-top:var(--sp-2)">Touchez pour noter</p>

        <!-- Pourboire -->
        <h3 style="margin: var(--sp-5) 0 var(--sp-2)">Ajouter un pourboire</h3>
        <div class="row gap-2" id="tips">
          ${CONFIG.ratings.tips
            .map(
              (t) => `
            <button class="chip grow" style="justify-content:center" data-tip="${t}">${money(t)}</button>`
            )
            .join('')}
        </div>

        <!-- Commentaire -->
        <div style="margin-top:var(--sp-4)">
          ${fieldLabel('Un mot pour le livreur ? (facultatif)')}
          <textarea class="textarea" id="reviewText" placeholder="Ponctualité, soin du colis,riendly…"></textarea>
        </div>
      </div>

      <footer class="screen-footer">
        <button class="btn btn-primary btn-block btn-lg" id="submitRating">Terminer et voir le reçu</button>
      </footer>
    `;
  },

  mount(root) {
    const order = getState().activeOrder;
    let rating = 0;
    let tip = 0;

    const labels = { 1: 'À revoir', 2: 'Décevant', 3: 'Correct', 4: 'Bien', 5: 'Excellent' };

    $$('[data-star]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        rating = Number(btn.dataset.star);
        $$('[data-star]', root).forEach((b) => {
          const on = Number(b.dataset.star) <= rating;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-checked', String(Number(b.dataset.star) === rating));
        });
        root.querySelector('#starLabel').textContent = labels[rating];
      });
    });

    $$('[data-tip]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = Number(btn.dataset.tip);
        tip = tip === value ? 0 : value;
        $$('[data-tip]', root).forEach((b) => {
          b.classList.toggle('is-active', Number(b.dataset.tip) === tip);
          b.setAttribute('aria-pressed', String(Number(b.dataset.tip) === tip));
        });
      });
    });

    root.querySelector('#submitRating')?.addEventListener('click', () => {
      const review = root.querySelector('#reviewText').value.trim();
      const updated = {
        ...order,
        status: 'terminee',
        rating,
        review,
        tip,
        deliveredAt: new Date().toISOString(),
      };
      setState({ activeOrder: updated });
      if (order?.id) updateOrder(order.id, updated);
      app.router.replace('receipt');
    });
  },

  unmount() {
    // L'animation du marqueur doit s'arrêter quand l'écran est quitté,
    // sinon le timer continue de tourner en arrière-plan.
    if (this._tracker) {
      this._tracker.stop();
      this._tracker = null;
    }
  },
});

/** Libellé de champ simple. */
function fieldLabel(text) {
  return `<span class="field-label" style="display:block;margin-bottom:var(--sp-2)">${escape(text)}</span>`;
}

/* ------------------------------------------------------------------ */
/* REÇU                                                                */
/* ------------------------------------------------------------------ */

export const receiptScreen = (app) => ({
  id: 'receipt',

  render() {
    const order = getState().activeOrder;
    const total = (order?.priceCdf || 0) + (order?.tip || 0);

    return `
      <header class="appbar">
        <div class="grow"></div>
        <button class="icon-btn" id="closeReceipt" aria-label="Fermer">${icon('x', { size: 20 })}</button>
      </header>

      <div class="screen-body screen-body-pad">
        <div style="text-align:center;margin-bottom:var(--sp-6)">
          <span style="display:grid;place-items:center;width:64px;height:64px;border-radius:var(--r-full);background:var(--success-soft);color:var(--success);margin:0 auto var(--sp-3)">
            ${icon('check', { size: 30, stroke: 2.5 })}
          </span>
          <h2>Course livrée</h2>
          <p class="muted small" style="margin-top:var(--sp-1)">${escape(order?.id || '')} · ${dateShort(order?.deliveredAt || new Date().toISOString())}</p>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4)">
          <dl style="margin:0">
            ${lineItem('Course', money(order?.priceCdf || 0))}
            ${order?.tip ? lineItem('Pourboire', money(order.tip)) : ''}
            ${order?.hasInsurance ? lineItem('Assurance colis', 'Incluse') : ''}
            <div class="line-item line-total"><dt>Total payé</dt><dd class="amount amount-md">${money(total)}</dd></div>
          </dl>
          <div class="divider" style="margin:var(--sp-3) 0"></div>
          <div class="between">
            <span class="small muted">Paiement</span>
            <span class="badge badge-brand">${escape(paymentLabel(order?.payment))}</span>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="between" style="margin-bottom:var(--sp-3)">
            <span class="semibold small">Itinéraire</span>
            <span class="small muted">${escape(order?.vehicle ? VEHICLES[order.vehicle].name : '')}</span>
          </div>
          <div class="route-line">
            <div class="route-point">
              <span class="route-marker">A</span>
              <span><span class="semibold small" style="display:block">${escape(order?.pickup?.name || '—')}</span></span>
            </div>
            <div class="route-connector"></div>
            <div class="route-point">
              <span class="route-marker is-dest">B</span>
              <span><span class="semibold small" style="display:block">${escape(order?.dropoff?.name || '—')}</span></span>
            </div>
          </div>
        </div>

        <div class="stack gap-2">
          <button class="btn btn-secondary btn-block" id="receiptShare">${icon('share', { size: 18 })} Partager le reçu</button>
          <button class="btn btn-ghost btn-block" id="receiptDone">Retour à l’accueil</button>
        </div>
      </div>
    `;
  },

  mount(root) {
    root.querySelector('#closeReceipt')?.addEventListener('click', () => app.router.reset('home'));
    root.querySelector('#receiptDone')?.addEventListener('click', () => app.router.reset('home'));
    root.querySelector('#receiptShare')?.addEventListener('click', () => {
      toast('Reçu partagé (simulation)', { type: 'success', iconName: 'share' });
    });
  },
});

/** Libellé lisible d'un moyen de paiement. */
function paymentLabel(id) {
  const found = CONFIG.paymentMethods.find((p) => p.id === id);
  return found ? found.label : id || '—';
}

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                        */
/* ------------------------------------------------------------------ */

export const notificationsScreen = (app) => ({
  id: 'notifications',

  render() {
    const items = [
      {
        icon: 'package',
        title: 'Votre colis a été récupéré',
        text: 'Junior Ilunga vient de prendre votre colis chez Big Market.',
        time: 'Il y a 4 min',
        tone: 'brand',
      },
      {
        icon: 'truck',
        title: 'Votre livreur est en route',
        text: 'Le départ est prévu à 9 h 35, avenue des Trois Martyrs.',
        time: 'Il y a 22 min',
        tone: 'cool',
      },
      {
        icon: 'percent',
        title: '-10 % sur votre prochaine course',
        text: 'Utilisez le code KULUNA10 avant le 30 novembre.',
        time: 'Hier',
        tone: 'warm',
      },
      {
        icon: 'star',
        title: 'Merci pour votre évaluation',
        text: 'Votre note de 5 étoiles aide la communauté à choisir.',
        time: '12 nov.',
        tone: 'warm',
      },
    ];

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Notifications</div>
          <div class="appbar-sub">${items.length} messages</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="markRead">Tout lire</button>
      </header>

      <div class="screen-body screen-body-pad">
        <div class="stack gap-2">
          ${items
            .map(
              (n) => `
            <div class="card" style="display:flex;gap:var(--sp-3);align-items:flex-start">
              <span class="order-icon ${n.tone === 'cool' ? 'is-cool' : n.tone === 'warm' ? 'is-warm' : 'is-brand'}">${icon(n.icon, { size: 18 })}</span>
              <span class="grow">
                <span class="semibold small" style="display:block">${escape(n.title)}</span>
                <span class="small muted" style="display:block;margin-top:2px">${escape(n.text)}</span>
                <span class="xsmall muted" style="display:block;margin-top:var(--sp-1)">${escape(n.time)}</span>
              </span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  },

  mount(root) {
    root.querySelector('#markRead')?.addEventListener('click', () => {
      toast('Tous les messages sont marqués comme lus', { type: 'success', iconName: 'check' });
    });
  },
});

/* ------------------------------------------------------------------ */
/* HISTORIQUE                                                          */
/* ------------------------------------------------------------------ */

export const historyScreen = (app) => ({
  id: 'history',

  render() {
    const orders = getState().orders;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Mes commandes</div>
          <div class="appbar-sub">${orders.length} commande(s) au total</div>
        </div>
      </header>

      <div style="flex-shrink:0;padding:0 var(--sp-4) var(--sp-3)">
        <div class="chip-row" role="tablist" aria-label="Filtrer les commandes">
          ${ORDER_FILTERS.map(
            (f, i) => `
            <button class="chip ${i === 0 ? 'is-active' : ''}" role="tab" aria-selected="${i === 0}" data-filter="${f.id}">
              ${escape(f.label)}
              <span class="badge badge-outline">${orders.filter((o) => o.status === f.id).length}</span>
            </button>`
          ).join('')}
        </div>
      </div>

      <div class="screen-body screen-body-pad" id="historyList"></div>
    `;
  },

  mount(root) {
    const list = root.querySelector('#historyList');
    let filter = 'en_cours';

    function render() {
      const orders = getState().orders.filter((o) => o.status === filter);
      if (!orders.length) {
        const messages = {
          en_cours: ['Aucune course en cours', 'Vos courses actives apparaîtront ici.', 'package'],
          terminee: ['Aucune commande terminée', 'Vos livraisons passées apparaîtront ici.', 'history'],
          annulee: ['Aucune commande annulée', 'Rien n’a été annulé pour l’instant.', 'x'],
        };
        const [title, text, ic] = messages[filter];
        list.innerHTML = emptyState({
          iconName: ic,
          title,
          text,
          action: filter === 'en_cours' ? `<button class="btn btn-primary btn-sm" data-neworder>Commander une course</button>` : '',
        });
        list.querySelector('[data-neworder]')?.addEventListener('click', () => {
          app.router.push('pick-point', { role: 'pickup' });
        });
        return;
      }
      list.innerHTML = `<div class="card-flat" style="overflow:hidden">${orders.map(app.orderRowHtml).join('')}</div>`;
      app.bindOrderRows(list);
    }

    $$('[data-filter]', root).forEach((chip) => {
      chip.addEventListener('click', () => {
        filter = chip.dataset.filter;
        $$('[data-filter]', root).forEach((c) => {
          const on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-selected', String(on));
        });
        render();
      });
    });

    render();
  },
});

/* ------------------------------------------------------------------ */
/* DÉTAIL D'UNE COMMANDE                                               */
/* ------------------------------------------------------------------ */

export const orderDetailScreen = (app) => ({
  id: 'order-detail',

  render(params) {
    const order = getState().orders.find((o) => o.id === params.id);
    if (!order) return `<div class="screen-body screen-body-pad">${emptyState({ iconName: 'alert', title: 'Commande introuvable', text: 'Cette commande n’existe plus.' })}</div>`;

    const statusMap = {
      en_cours: { label: 'En cours', cls: 'badge-brand' },
      recherche: { label: 'Recherche en cours', cls: 'badge-info' },
      terminee: { label: 'Livrée', cls: 'badge-success' },
      annulee: { label: 'Annulée', cls: 'badge-danger' },
    };
    const st = statusMap[order.status] || statusMap.en_cours;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">${escape(order.id)}</div>
          <div class="appbar-sub">${dateShort(order.createdAt)} · ${relative(order.createdAt)}</div>
        </div>
        <span class="badge ${st.cls}">${st.label}</span>
      </header>

      <div class="screen-body screen-body-pad">
        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="route-line">
            <div class="route-point">
              <span class="route-marker">A</span>
              <span>
                <span class="semibold small" style="display:block">${escape(order.pickup?.name || '—')}</span>
                <span class="xsmall muted" style="display:block">${escape(order.pickup?.street || '')}</span>
                ${order.contacts?.pickup ? `<span class="xsmall muted" style="display:block">${icon('user', { size: 11 })} ${escape(order.contacts.pickup)}</span>` : ''}
              </span>
            </div>
            <div class="route-connector"></div>
            <div class="route-point">
              <span class="route-marker is-dest">B</span>
              <span>
                <span class="semibold small" style="display:block">${escape(order.dropoff?.name || '—')}</span>
                <span class="xsmall muted" style="display:block">${escape(order.dropoff?.street || '')}</span>
                ${order.contacts?.dropoff ? `<span class="xsmall muted" style="display:block">${icon('user', { size: 11 })} ${escape(order.contacts.dropoff)}</span>` : ''}
              </span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4)">
          <dl style="margin:0">
            ${lineItem('Véhicule', VEHICLES[order.vehicle]?.name || '—')}
            ${lineItem('Type de colis', CONFIG.packageTypes.find((t) => t.id === order.packageType)?.label || '—')}
            ${lineItem('Poids', `${order.weightKg} kg`)}
            ${lineItem('Paiement', paymentLabel(order.payment))}
            ${order.rating ? lineItem('Votre note', `${order.rating}/5`) : ''}
            ${order.tip ? lineItem('Pourboire', money(order.tip)) : ''}
            <div class="line-item line-total"><dt>Total</dt><dd class="amount amount-md">${money((order.priceCdf || 0) + (order.tip || 0))}</dd></div>
          </dl>
        </div>

        ${order.note ? `<div class="notice notice-info" style="margin-bottom:var(--sp-4)"><span class="notice-icon">${icon('message', { size: 16 })}</span><span>${escape(order.note)}</span></div>` : ''}

        <div class="stack gap-2">
          ${
            order.status === 'en_cours'
              ? `<button class="btn btn-primary btn-block" data-track>${icon('navigation', { size: 18 })} Suivre ma course</button>`
              : ''
          }
          <button class="btn btn-secondary btn-block" id="reorderBtn">
            ${icon('repeat', { size: 18 })} Commander à nouveau
          </button>
          <button class="btn btn-ghost btn-block" id="invoiceBtn">
            ${icon('file-text', { size: 18 })} Télécharger le reçu
          </button>
        </div>
      </div>
    `;
  },

  mount(root, params) {
    const order = getState().orders.find((o) => o.id === params.id);

    root.querySelector('[data-track]')?.addEventListener('click', () => {
      setState({ activeOrder: order });
      app.router.push('tracking');
    });

    root.querySelector('#reorderBtn')?.addEventListener('click', () => {
      updateDraft({
        service: order.service,
        pickup: { ...order.pickup, contactName: '', contactPhone: '' },
        dropoff: { ...order.dropoff, contactName: '', contactPhone: '' },
        packageType: order.packageType,
        weightKg: order.weightKg,
        vehicleId: order.vehicle,
      });
      app.router.push('pick-point', { role: 'pickup' });
    });

    root.querySelector('#invoiceBtn')?.addEventListener('click', () => {
      toast('Reçu téléchargé (simulation)', { type: 'success', iconName: 'check' });
    });
  },
});

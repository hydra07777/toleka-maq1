/**
 * ÉCRANS — Mode livreur.
 * Inscription, bascule en ligne, réception de demande, navigation, gains.
 */

import CONFIG from '../../config/app.config.js';
import { VEHICLES, DRIVER_SIGNUP } from '../../data/vehicles.js';
import { DRIVERS } from '../../data/drivers.js';
import { icon, vehicleIllustration } from '../icons.js';
import { escape, money, minutes as fmtMinutes, km as fmtKm, time as fmtTime, relative } from '../format.js';
import { billedDistance } from '../geo.js';
import { getState, setState, updateDraft } from '../store.js';
import { $, $$, toast, openSheet, openModal, notice, emptyState, field } from '../ui.js';
import { createMap, addMarker, drawRoute, fitBounds, renderFallbackMap, whenReady } from '../map.js';

/* ------------------------------------------------------------------ */
/* INSCRIPTION LIVREUR                                                  */
/* ------------------------------------------------------------------ */

export const driverSignupScreen = (app) => ({
  id: 'driver-signup',

  render() {
    const s = getState();
    const chosen = s.driver.profile?.vehicle || null;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Devenir livreur</div>
          <div class="appbar-sub">Étape ${chosen ? '2' : '1'} sur 2</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        ${
          chosen
            ? `
          <h3 style="margin-bottom:var(--sp-1)">Vos informations</h3>
          <p class="small muted" style="margin-bottom:var(--sp-4)">
            ${escape(VEHICLES[chosen].name)} · ${escape(DRIVER_SIGNUP[chosen].desc)}
          </p>
          <div class="stack gap-3">
            ${field({
              id: 'drvName',
              label: 'Nom complet',
              control: `<input class="input" id="drvName" placeholder="Ex. Junior Ilunga" value="${escape(s.driver.profile?.name || '')}" autocomplete="name">`,
            })}
            ${field({
              id: 'drvPhone',
              label: 'Téléphone',
              hint: 'Format congolais : +243 8XX XXX XXX',
              control: `<input class="input" id="drvPhone" type="tel" inputmode="tel" placeholder="+243 81 234 567" value="${escape(s.driver.profile?.phone || '')}" autocomplete="tel">`,
            })}
            ${DRIVER_SIGNUP[chosen].fields
              .map(
                (f) => `
              ${field({
                id: `drv_${f.id}`,
                label: f.label,
                control:
                  f.type === 'select'
                    ? `<select class="select" id="drv_${f.id}">
                        <option value="">Choisir…</option>
                        ${f.options.map((o) => `<option ${s.driver.profile?.[f.id] === o ? 'selected' : ''}>${escape(o)}</option>`).join('')}
                      </select>`
                    : `<input class="input" id="drv_${f.id}" placeholder="${escape(f.placeholder || '')}" value="${escape(s.driver.profile?.[f.id] || '')}">`,
              })}`
              )
              .join('')}
          </div>
        `
            : `
          <h3 style="margin-bottom:var(--sp-1)">Quel véhicule utilisez-vous ?</h3>
          <p class="small muted" style="margin-bottom:var(--sp-4)">
            Vous ne recevrez que les courses compatibles avec votre véhicule.
          </p>
          <div class="stack gap-3" role="radiogroup" aria-label="Type de véhicule">
            ${Object.values(DRIVER_SIGNUP)
              .map(
                (v) => `
              <button class="check-card" role="radio" aria-checked="false" data-vtype="${v.vehicle}" style="width:100%;text-align:left">
                <span class="check-mark">${icon('check', { size: 13, stroke: 3 })}</span>
                <span class="grow">
                  <span class="semibold">${escape(v.label)}</span>
                  <span class="small muted" style="display:block;margin-top:2px">${escape(v.desc)}</span>
                  <span class="small" style="display:block;margin-top:var(--sp-1);color:var(--text-brand);font-weight:600">
                    Jusqu’à ${v.maxKg} kg
                  </span>
                </span>
                <span style="color:var(--ink-500);flex-shrink:0">${vehicleIllustration(v.vehicle, 42)}</span>
              </button>`
              )
              .join('')}
          </div>
        `
        }
      </div>

      <footer class="screen-footer">
        <button class="btn btn-primary btn-block btn-lg" id="driverNext">
          ${chosen ? 'Terminer l’inscription' : 'Continuer'} ${icon('arrow-right', { size: 18 })}
        </button>
      </footer>
    `;
  },

  mount(root) {
    const s = getState();
    const chosen = s.driver.profile?.vehicle || null;

    if (!chosen) {
      $$('[data-vtype]', root).forEach((btn) => {
        btn.addEventListener('click', () => {
          updateDraft({});
          setState((st) => ({
            driver: { ...st.driver, profile: { ...(st.driver.profile || {}), vehicle: btn.dataset.vtype } },
          }));
          // On rerend l'écran pour afficher les champs spécifiques
          app.router.push('driver-signup', { force: true });
        });
      });
    }

    root.querySelector('#driverNext')?.addEventListener('click', () => {
      if (!chosen) {
        toast('Choisissez votre véhicule', { type: 'error' });
        return;
      }

      const name = root.querySelector('#drvName')?.value.trim();
      const phone = root.querySelector('#drvPhone')?.value.trim();
      if (!name) {
        toast('Indiquez votre nom', { type: 'error' });
        return;
      }

      const profile = { ...(s.driver.profile || {}), name, phone };
      DRIVER_SIGNUP[chosen].fields.forEach((f) => {
        const val = root.querySelector(`#drv_${f.id}`)?.value.trim();
        profile[f.id] = val || '';
      });

      setState((st) => ({
        driver: { ...st.driver, profile, signupComplete: true },
      }));

      toast('Inscription terminée — vous êtes en ligne', { type: 'success', iconName: 'check' });
      app.router.replace('driver-home');
    });
  },
});

/* ------------------------------------------------------------------ */
/* ACCUEIL LIVREUR                                                      */
/* ------------------------------------------------------------------ */

export const driverHomeScreen = (app) => ({
  id: 'driver-home',

  render() {
    const s = getState();
    const online = s.driver.isOnline;
    const profile = s.driver.profile;
    const trips = s.driver.trips || [];
    const today = trips.filter((t) => t.date === new Date().toISOString().slice(0, 10));
    const earningsToday = today.reduce((s2, t) => s2 + t.gain, 0);
    const earningsWeek = trips.reduce((s2, t) => s2 + t.gain, 0);

    return `
      <header class="appbar">
        <div class="grow">
          <div class="appbar-title">Espace livreur</div>
          <div class="appbar-sub">${escape(profile?.name || 'Livreur')}${profile?.vehicle ? ' · ' + escape(VEHICLES[profile.vehicle].name) : ''}</div>
        </div>
        <button class="icon-btn" id="driverSwitchMode" aria-label="Revenir au mode client">${icon('logout2', { size: 19 })}</button>
      </header>

      <div class="screen-body screen-body-pad">
        <!-- Bascule en ligne -->
        <button class="status-toggle ${online ? 'is-online' : ''}" id="onlineToggle" style="width:100%;text-align:left;margin-bottom:var(--sp-4)">
          <span>
            <span class="semibold" style="display:block;font-size:var(--fs-h3)">${online ? 'En ligne' : 'Hors ligne'}</span>
            <span class="small" style="opacity:.82">${online ? 'Vous recevez les demandes compatibles' : 'Activez pour recevoir des courses'}</span>
          </span>
          <span class="switch" role="switch" aria-checked="${online}" tabindex="-1" style="background:${online ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.18)'}">
            <span class="sr-only">Statut</span>
          </span>
        </button>

        <!-- Gains -->
        <div class="earnings-grid" style="margin-bottom:var(--sp-4)">
          <div class="earnings-card is-primary">
            <div class="earnings-label">Aujourd’hui</div>
            <div class="earnings-value">${money(earningsToday)}</div>
            <div class="earnings-label" style="margin-top:2px">${today.length} course(s)</div>
          </div>
          <div class="earnings-card">
            <div class="earnings-label">Cette semaine</div>
            <div class="earnings-value">${money(earningsWeek)}</div>
            <div class="earnings-label" style="margin-top:2px">${trips.length} course(s)</div>
          </div>
        </div>

        <!-- Courses -->
        <div class="between" style="margin-bottom:var(--sp-2)">
          <h3>Mes courses</h3>
          <button class="btn btn-ghost btn-sm" id="earningsBtn">Mes gains</button>
        </div>

        ${
          trips.length
            ? `<div class="card-flat" style="overflow:hidden">${trips.map(tripRow).join('')}</div>`
            : `<div class="card">${emptyState({
                iconName: 'route',
                title: online ? 'En attente de courses' : 'Vous êtes hors ligne',
                text: online
                  ? 'Les demandes compatibles avec votre véhicule apparaîtront ici.'
                  : 'Passez en ligne pour recevoir vos premières demandes.',
              })}</div>`
        }
      </div>

      <div id="offerHost"></div>
    `;
  },

  mount(root) {
    const s = getState();

    root.querySelector('#onlineToggle')?.addEventListener('click', () => {
      const next = !getState().driver.isOnline;
      setState((st) => ({ driver: { ...st.driver, isOnline: next } }));
      toast(next ? 'Vous êtes en ligne' : 'Vous êtes hors ligne', {
        type: next ? 'success' : 'default',
        iconName: next ? 'check' : 'bolt',
      });
      app.router.push('driver-home', { force: true });
    });

    root.querySelector('#driverSwitchMode')?.addEventListener('click', () => {
      app.switchMode('client');
    });

    root.querySelector('#earningsBtn')?.addEventListener('click', () => {
      app.router.push('driver-earnings');
    });

    // Simule l'arrivée d'une demande si le livreur est en ligne
    if (s.driver.isOnline && !root.querySelector('#offerHost')?.dataset.done) {
      const host = root.querySelector('#offerHost');
      if (host) host.dataset.done = '1';
      setTimeout(() => {
        if (!document.body.contains(root)) return;
        app.showDriverOffer(root.querySelector('#offerHost'));
      }, 1400);
    }
  },
});

/** Ligne de course dans la liste du livreur. */
function tripRow(trip) {
  return `
    <div class="order-row">
      <span class="order-icon">${icon('package', { size: 20 })}</span>
      <span class="grow" style="min-width:0">
        <span class="between">
          <span class="semibold truncate">${escape(trip.pickup)} → ${escape(trip.dropoff)}</span>
          <span class="semibold" style="color:var(--text-brand)">${money(trip.gain)}</span>
        </span>
        <span class="small muted">${escape(trip.time)} · ${escape(fmtKm(trip.distanceKm))}</span>
      </span>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* POPUP DE DEMANDE (minuteur 15 s)                                    */
/* ------------------------------------------------------------------ */

export function buildOfferPopup(order, seconds, onAccept, onRefuse) {
  const spec = VEHICLES[order.vehicle];
  const circumference = 2 * Math.PI * 24;

  return `
    <div class="offer-popup" role="dialog" aria-label="Nouvelle demande de course">
      <div style="padding:var(--sp-4) var(--sp-4) var(--sp-3);background:var(--ink-900);color:var(--text-inverse);display:flex;align-items:center;gap:var(--sp-3)">
        <span class="timer-ring" id="offerTimer">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="track" cx="28" cy="28" r="24"/>
            <circle class="bar" cx="28" cy="28" r="24" stroke-dasharray="${circumference}" stroke-dashoffset="0"/>
          </svg>
          <span class="timer-value" id="timerValue">${seconds}</span>
        </span>
        <span class="grow">
          <span class="semibold" style="display:block;font-size:var(--fs-h3)">Nouvelle demande</span>
          <span class="small" style="opacity:.8">${escape(order.pickup.name)} → ${escape(order.dropoff.name)}</span>
        </span>
        <span style="text-align:right">
          <span class="amount amount-md" style="display:block;color:var(--brand-300)">${money(order.gainCdf)}</span>
          <span class="xsmall" style="opacity:.7">${escape(fmtKm(order.distanceKm))}</span>
        </span>
      </div>

      <div style="padding:var(--sp-4)">
        <!-- Aide à la démo : le code de confirmation est affiché pour que
             le présentateur puisse le lire. En production, ce code n'est
             connu que du client, qui le communique au livreur. -->
        <div class="demo-code">
          <span class="demo-code-label">Code de confirmation</span>
          <span class="demo-code-value">${order.code}</span>
          <span class="demo-code-hint">Le client vous le dictera à la livraison</span>
        </div>

        <div class="row gap-3" style="margin-bottom:var(--sp-3)">
          <span style="display:grid;place-items:center;width:40px;height:40px;border-radius:var(--r-md);background:var(--ink-050);color:var(--ink-600)">
            ${icon(spec.id === 'moto' ? 'motorcycle' : spec.id === 'tricycle' ? 'tricycle' : spec.id === 'voiture' ? 'car' : 'van', { size: 20 })}
          </span>
          <span class="grow">
            <span class="semibold small" style="display:block">${escape(spec.name)} · ${escape(order.weightKg)} kg</span>
            <span class="xsmall muted">${escape(order.packageLabel)}</span>
          </span>
          <span class="badge badge-brand">${escape(order.distanceKm.toFixed(1))} km</span>
        </div>

        <div class="row gap-2">
          <button class="btn btn-secondary grow" id="refuseBtn">Refuser</button>
          <button class="btn btn-primary grow" id="acceptBtn">${icon('check', { size: 17 })} Accepter</button>
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* NAVIGATION LIVREUR                                                   */
/* ------------------------------------------------------------------ */

export const driverNavScreen = (app) => ({
  id: 'driver-nav',
  fullBleed: true,

  render() {
    const offer = getState().driver.currentOffer;
    const step = getState().driver.navStep || 0;

    return `
      <div class="tracking-map" id="driverMap"></div>
      <div class="map-scrim" style="background:linear-gradient(180deg,rgba(255,255,255,0.92) 0%,rgba(255,255,255,0) 20%,rgba(255,255,255,0) 55%,rgba(255,255,255,0.95) 80%)"></div>

      <header class="appbar" style="position:absolute;top:0;left:0;right:0;z-index:25">
        <div class="grow">
          <div class="appbar-title">${step === 0 ? 'Vers le retrait' : step === 1 ? 'Vers la livraison' : 'Livraison terminée'}</div>
          <div class="appbar-sub">${escape(offer?.pickup?.name || '')} → ${escape(offer?.dropoff?.name || '')}</div>
        </div>
      </header>

      <div class="tracking-card tracking-card-top">
        <div class="between">
          <div>
            <div class="xsmall muted">Gain de la course</div>
            <div class="amount amount-md">${money(offer?.gainCdf || 0)}</div>
          </div>
          <div style="text-align:right">
            <div class="xsmall muted">Distance</div>
            <div class="semibold">${fmtKm(offer?.distanceKm || 0)}</div>
          </div>
        </div>
      </div>

      <div class="tracking-card" style="bottom:calc(var(--tabbar-h) + var(--sp-4))">
        <ol class="stepper" id="driverStepper"></ol>
        <div id="driverAction" style="margin-top:var(--sp-4)"></div>
      </div>
    `;
  },

  async mount(root) {
    const offer = getState().driver.currentOffer;
    if (!offer) {
      app.router.replace('driver-home');
      return;
    }

    await whenReady();
    if (!document.body.contains(root)) return;

    const map = createMap(root.querySelector('#driverMap'));
    if (map) {
      fitBounds(map, [offer.pickup, offer.dropoff]);
      addMarker(map, offer.pickup.lat, offer.pickup.lon, 'pick', { size: 'sm' });
      addMarker(map, offer.dropoff.lat, offer.dropoff.lon, 'dropoff', { size: 'sm' });
      drawRoute(map, [offer.pickup, offer.dropoff], { color: '#0E9F6E', weight: 4, opacity: 0.45, dashArray: '8 8' });
    } else {
      renderFallbackMap(root.querySelector('#driverMap'));
    }

    const steps = [
      { label: 'En route vers le retrait', key: 'to_pickup' },
      { label: 'Colis récupéré', key: 'picked' },
      { label: 'En route vers la livraison', key: 'delivering' },
      { label: 'Livré', key: 'delivered' },
    ];

    let stepIndex = getState().driver.navStep || 0;

    function render() {
      const stepper = root.querySelector('#driverStepper');
      const action = root.querySelector('#driverAction');

      stepper.innerHTML = steps
        .map((s, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo';
          return `
            <li class="step ${state === 'done' ? 'is-done' : state === 'current' ? 'is-current' : ''}">
              <span class="step-rail"><span class="step-dot">${icon('check', { size: 15, stroke: 3 })}</span></span>
              <span><span class="step-label" style="display:block">${escape(s.label)}</span></span>
            </li>`;
        })
        .join('');

      const buttons = {
        0: `<button class="btn btn-primary btn-block btn-lg" id="arrivedBtn">${icon('map-pin', { size: 18 })} Je suis arrivé au retrait</button>`,
        1: `<button class="btn btn-primary btn-block btn-lg" id="pickedBtn">${icon('package', { size: 18 })} Colis récupéré</button>`,
        2: `<button class="btn btn-primary btn-block btn-lg" id="deliveredBtn">${icon('check', { size: 18 })} Livré — demander le code</button>`,
        3: `<button class="btn btn-secondary btn-block" id="finishBtn">Terminer la course</button>`,
      };

      action.innerHTML = buttons[stepIndex] || '';

      action.querySelector('#arrivedBtn')?.addEventListener('click', () => {
        stepIndex = 1;
        setState((st) => ({ driver: { ...st.driver, navStep: stepIndex } }));
        render();
      });
      action.querySelector('#pickedBtn')?.addEventListener('click', () => {
        stepIndex = 2;
        setState((st) => ({ driver: { ...st.driver, navStep: stepIndex } }));
        render();
      });
      action.querySelector('#deliveredBtn')?.addEventListener('click', () => {
        // Demande du code client
        const codeSheet = openSheet({
          title: 'Code de confirmation',
          container: app.phoneEl,
          content: `
            <p class="small muted" style="margin-bottom:var(--sp-3)">Demandez le code au client (${escape(offer.clientName || offer.dropoff.contactName || 'votre client')}). Il doit correspondre au code affiché dans l’application du client.</p>
            <input class="input" id="clientCode" inputmode="numeric" maxlength="6" placeholder="Code à 6 chiffres" style="text-align:center;font-size:var(--fs-h2);letter-spacing:.4em;font-weight:800">
            <div id="codeError" style="margin-top:var(--sp-2)"></div>
            <!-- Aide à la démo : pré-remplissage du code. En production,
                 le livreur ne connaît le code que si le client le lui donne. -->
            <button class="demo-fill" id="fillCode" type="button">
              ${icon('ticket', { size: 14 })} Simuler la saisie du code client
            </button>
          `,
          footer: `<button class="btn btn-primary btn-block btn-lg" id="validateCode">Valider la livraison</button>`,
        });

        // Aide démo : on remplit le champ avec le code attendu
        codeSheet.element.querySelector('#fillCode')?.addEventListener('click', () => {
          const input = codeSheet.element.querySelector('#clientCode');
          if (input) input.value = offer.code;
        });

        codeSheet.element.querySelector('#validateCode')?.addEventListener('click', () => {
          const input = codeSheet.element.querySelector('#clientCode');
          const err = codeSheet.element.querySelector('#codeError');
          if (input.value.trim() !== offer.code) {
            err.innerHTML = notice('danger', 'Code incorrect', 'Vérifiez le code auprès du client.');
            return;
          }
          codeSheet.close();
          stepIndex = 3;
          setState((st) => ({ driver: { ...st.driver, navStep: stepIndex } }));
          render();
          toast('Livraison confirmée', { type: 'success', iconName: 'check' });
        });
      });
      action.querySelector('#finishBtn')?.addEventListener('click', () => {
        // On enregistre la course dans les gains du livreur
        const trip = {
          id: offer.id,
          date: new Date().toISOString().slice(0, 10),
          time: fmtTime(new Date().toISOString()),
          pickup: offer.pickup.name,
          dropoff: offer.dropoff.name,
          distanceKm: offer.distanceKm,
          gain: offer.gainCdf,
        };
        setState((st) => ({
          driver: { ...st.driver, trips: [trip, ...(st.driver.trips || [])], currentOffer: null, navStep: 0 },
        }));
        app.router.replace('driver-earnings');
      });
    }

    render();
  },
});

/* ------------------------------------------------------------------ */
/* GAINS LIVREUR                                                        */
/* ------------------------------------------------------------------ */

export const driverEarningsScreen = (app) => ({
  id: 'driver-earnings',

  render() {
    const s = getState();
    const trips = s.driver.trips || [];
    const today = trips.filter((t) => t.date === new Date().toISOString().slice(0, 10));
    const week = trips;
    const sum = (list) => list.reduce((a, t) => a + t.gain, 0);
    const balance = sum(week);

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Mes gains</div>
          <div class="appbar-sub">Retrait par Mobile Money</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <div class="card" style="background:var(--ink-900);color:var(--text-inverse);margin-bottom:var(--sp-4);border:none">
          <div class="xsmall" style="opacity:.7">Solde disponible</div>
          <div class="amount amount-lg" style="margin:var(--sp-1) 0">${money(balance)}</div>
          <button class="btn btn-primary btn-block" id="withdrawBtn">
            ${icon('wallet', { size: 18 })} Retirer par Mobile Money
          </button>
        </div>

        <div class="earnings-grid" style="margin-bottom:var(--sp-4)">
          <div class="earnings-card">
            <div class="earnings-label">Aujourd’hui</div>
            <div class="earnings-value">${money(sum(today))}</div>
            <div class="earnings-label" style="margin-top:2px">${today.length} course(s)</div>
          </div>
          <div class="earnings-card">
            <div class="earnings-label">Cette semaine</div>
            <div class="earnings-value">${money(sum(week))}</div>
            <div class="earnings-label" style="margin-top:2px">${week.length} course(s)</div>
          </div>
        </div>

        <h3 style="margin-bottom:var(--sp-2)">Historique des courses</h3>
        ${
          trips.length
            ? `<div class="card-flat" style="overflow:hidden">${trips.map(tripRow).join('')}</div>`
            : `<div class="card">${emptyState({
                iconName: 'wallet',
                title: 'Aucun gain pour l’instant',
                text: 'Vos courses apparaîtront ici avec leur montant.',
              })}</div>`
        }
      </div>
    `;
  },

  mount(root) {
    root.querySelector('#withdrawBtn')?.addEventListener('click', () => {
      openModal({
        title: 'Retrait Mobile Money',
        body: `Le montant sera viré sur votre numéro ${escape(getState().driver.profile?.phone || '+243 81 234 567')}. Retrait simulé, aucun débit réel.`,
        actions: [
          { label: 'Confirmer le retrait', variant: 'primary', onClick: () => toast('Retrait demandé — arrives sous 24 h', { type: 'success', iconName: 'check' }) },
          { label: 'Annuler', variant: 'secondary' },
        ],
        container: app.phoneEl,
      });
    });
  },
});

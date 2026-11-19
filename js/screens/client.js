/**
 * ÉCRANS — Parcours client.
 * Accueil, choix des points, colis, véhicule, options, récapitulatif.
 */

import CONFIG from '../../config/app.config.js';
import { PLACES } from '../../data/places.js';
import { VEHICLES, VEHICLE_ORDER } from '../../data/vehicles.js';
import { SERVICES, SAVED_ADDRESSES } from '../../data/orders.js';
import { icon, vehicleIllustration } from '../icons.js';
import { brandLogo } from '../brand.js';
import { escape, money, phone as fmtPhone, minutes as fmtMinutes, km as fmtKm, relative } from '../format.js';
import { quote, vehicleWarning, suggestVehicle, needsLongDistanceVehicle } from '../pricing.js';
import { billedDistance, arrivalMinutes } from '../geo.js';
import { $, $$, el, render, toast, openSheet, field, notice, skeletonVehicle } from '../ui.js';
import { createMap, addMarker, removeMarker, fitBounds, setView, renderFallbackMap, whenReady, refreshAllMaps } from '../map.js';
import { getState, updateDraft, setState } from '../store.js';

/* ------------------------------------------------------------------ */
/* ACCUEIL                                                             */
/* ------------------------------------------------------------------ */

export const homeScreen = (app) => ({
  id: 'home',
  fullBleed: true,

  render() {
    const s = getState();
    const recent = s.orders.slice(0, 2);

    return `
      <div class="home-map" id="homeMap"></div>
      <div class="map-scrim"></div>

      <header class="appbar home-header" style="position:absolute;top:0;left:0;right:0;z-index:25;justify-content:space-between">
        <div>
          ${brandLogo(26, { markColor: 'var(--brand-300)', textColor: 'var(--ink-900)', subtitle: false })}
          <div class="appbar-sub">${escape(CONFIG.app.city)} · Livraison de colis & courses</div>
        </div>
        <button class="icon-btn" data-go="notifications" aria-label="Notifications" style="position:relative">
          ${icon('bell', { size: 21 })}
          <span style="position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--danger);border:2px solid var(--surface)"></span>
        </button>
      </header>

      <div class="search-float">
        <div class="search">
          <span class="search-icon">${icon('search', { size: 18 })}</span>
          <input class="input" id="homeSearch" type="search" placeholder="Où livrer ?" aria-label="Adresse de livraison" readonly>
        </div>
      </div>

      <button class="locate-fab" id="locateBtn" style="bottom:calc(var(--tabbar-h) + 296px)" aria-label="Ma position">
        ${icon('locate', { size: 20 })}
      </button>

      <div class="home-panel">
        <div class="quick-grid" role="group" aria-label="Type de course">
          ${SERVICES.map(
            (svc) => `
            <button class="quick" data-service="${svc.id}">
              <span class="quick-icon ${svc.tone}">${icon(svc.icon, { size: 20 })}</span>
              <span class="quick-label">${escape(svc.label)}</span>
            </button>`
          ).join('')}
        </div>

        <div style="margin-top:var(--sp-4)">
          <div class="between" style="margin-bottom:var(--sp-2)">
            <h3>Commandes récentes</h3>
            <button class="btn btn-ghost btn-sm" data-go="history">Tout voir</button>
          </div>
          ${
            recent.length
              ? `<div class="card-flat" style="overflow:hidden">${recent.map(app.orderRowHtml).join('')}</div>`
              : `<div class="card">${`<p class="small muted" style="text-align:center;padding:var(--sp-3)">Aucune commande pour l’instant</p>`}</div>`
          }
        </div>
      </div>

    `;
  },

  async mount(root) {
    const mapHost = root.querySelector('#homeMap');

    // Leaflet arrive en réseau : on attend qu'il soit prêt avant de créer
    // la carte, sinon l'écran reste bloillé sur la carte de repli.
    await whenReady();

    // L'écran a pu être quitté pendant l'attente
    if (!document.body.contains(mapHost)) return;

    const map = createMap(mapHost);
    if (map) {
      setView(map, CONFIG.map.center[0], CONFIG.map.center[1], CONFIG.map.zoom);
      // Le bas de l'écran est couvert par le panneau flottant : on décale la
      // vue pour que le centre de Kinshasa tombe dans la bande visible
      // (sinon on ne voit que le fleuve et Brazzaville).
      map.panBy([0, 150]);
    } else {
      renderFallbackMap(mapHost);
    }
    app.rememberMap('home', map);

    // Barre de recherche → ouvre le sélecteur de point de livraison
    root.querySelector('#homeSearch')?.addEventListener('click', () => {
      app.router.push('pick-point', { role: 'dropoff' });
    });

    // Raccourcis de service
    $$('[data-service]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const svc = SERVICES.find((x) => x.id === btn.dataset.service);
        updateDraft({
          service: svc.id,
          packageType: svc.defaultPackage,
          vehicleId: svc.defaultVehicle,
        });
        app.router.push('pick-point', { role: 'pickup' });
      });
    });

    // Bouton de localisation
    const locateBtn = root.querySelector('#locateBtn');
    locateBtn?.addEventListener('click', () => {
      locateBtn.classList.add('is-locating');
      toast('Position actualisée — Gombe, Kinshasa', { type: 'success', iconName: 'navigation' });
      setTimeout(() => locateBtn.classList.remove('is-locating'), 900);
    });

    app.bindOrderRows(root);
  },
});

/* ------------------------------------------------------------------ */
/* SÉLECTION D'UN POINT (retrait ou livraison)                         */
/* ------------------------------------------------------------------ */
/*
 * Layout : la carte occupe le haut, la liste des lieux est DANS le flux
 * (pas une feuille flottante), et le bouton de confirmation est dans un
 * pied fixe.
 *
 * Avant, la liste était une feuille flottante qui recouvrait la carte ET le
 * bouton « Confirmer ce point » : cliquer un lieu déplaçait le marqueur
 * sous la feuille (donc invisible) et le bouton de validation était
 * introuvable au doigt.
 */
export const pickPointScreen = (app) => ({
  id: 'pick-point',
  hideTabbar: true,

  render(params) {
    const role = params.role || 'pickup';
    const draft = getState().draft;
    const isPickup = role === 'pickup';
    const current = isPickup ? draft.pickup : draft.dropoff;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">${isPickup ? 'Point de retrait' : 'Point de livraison'}</div>
          <div class="appbar-sub">${isPickup ? 'Où prendre le colis ?' : 'Où livrer le colis ?'}</div>
        </div>
        ${draft.pickup && draft.dropoff ? '' : `<span class="badge badge-brand">${isPickup ? '1 / 2' : '2 / 2'}</span>`}
      </header>

      <!-- Carte : occupe le haut, toujours visible -->
      <div class="pick-map-wrap">
        <div class="map-pane" id="pickMap"></div>

        <div class="pick-search">
          <div class="search">
            <span class="search-icon">${icon('search', { size: 18 })}</span>
            <input class="input" id="pointSearch" type="search" placeholder="Rechercher un lieu à Kinshasa" aria-label="Rechercher un lieu">
          </div>
        </div>

        <p class="pick-hint">${icon('map-pin', { size: 13 })} Touchez la carte pour placer le point</p>
      </div>

      <!-- Liste des lieux : dans le flux, elle ne masque jamais la carte -->
      <div class="pick-list">
        <div class="pick-list-head">
          <h3 id="placeSheetTitle">Lieux suggérés</h3>
          <button class="icon-btn" id="toggleList" aria-expanded="true" aria-label="Replier la liste">
            ${icon('chevron-up', { size: 18 })}
          </button>
        </div>
        <div class="pick-list-scroll" id="placeResults"></div>
      </div>

      <footer class="screen-footer">
        <button class="btn btn-primary btn-block btn-lg" id="usePin" disabled>
          ${icon('map-pin', { size: 18 })} <span>Choisissez un lieu</span>
        </button>
      </footer>
    `;
  },

  async mount(root, params) {
    const role = params.role || 'pickup';
    const isPickup = role === 'pickup';
    const draft = getState().draft;
    const current = isPickup ? draft.pickup : draft.dropoff;

    /* ---- Carte ---- */
    const mapHost = root.querySelector('#pickMap');

    // Leaflet est chargé depuis le CDN : sans cette attente, `createMap`
    // renvoie null et l'écran garde la carte de repli — plus aucun marqueur
    // n'apparaît, le clic sur un lieu ne fait rien.
    await whenReady();
    if (!document.body.contains(mapHost)) return;

    const map = createMap(mapHost);
    let pin = null;

    const draftPoint = current
      ? { lat: current.lat, lon: current.lon, name: current.name, street: current.street || '' }
      : { lat: 0, lon: 0, name: '', street: '' };

    const confirmBtn = root.querySelector('#usePin');
    const confirmLabel = confirmBtn.querySelector('span');

    /** Met à jour le bouton de confirmation. */
    const syncConfirm = () => {
      const has = Boolean(draftPoint.name);
      confirmBtn.disabled = !has;
      confirmLabel.textContent = has ? 'Confirmer ce point' : 'Choisissez un lieu';
    };

    /** Place le marqueur et recadre. */
    const placePin = (lat, lon) => {
      if (!map) return;
      if (pin) removeMarker(pin);
      pin = addMarker(map, lat, lon, isPickup ? 'pick' : 'dropoff');
      setView(map, lat, lon, Math.max(map.getZoom(), CONFIG.map.pickZoom));
    };

    if (map) {
      const center = current || draft.pickup || { lat: CONFIG.map.center[0], lon: CONFIG.map.center[1] };
      setView(map, center.lat, center.lon, CONFIG.map.pickZoom);

      // Marques des points déjà choisis
      if (draft.pickup) addMarker(map, draft.pickup.lat, draft.pickup.lon, 'pick', { size: 'sm' });
      if (draft.dropoff) addMarker(map, draft.dropoff.lat, draft.dropoff.lon, 'dropoff', { size: 'sm' });

      if (current) pin = addMarker(map, current.lat, current.lon, isPickup ? 'pick' : 'dropoff');

      map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        draftPoint.lat = lat;
        draftPoint.lon = lon;
        draftPoint.name = 'Position sur la carte';
        draftPoint.street = '';
        placePin(lat, lon);
        syncConfirm();
        highlightSelected();
      });
    } else {
      renderFallbackMap(mapHost);
    }

    /* ---- Liste des lieux ---- */
    const results = root.querySelector('#placeResults');
    const title = root.querySelector('#placeSheetTitle');

    function renderPlaces(filter) {
      const list = filter
        ? PLACES.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
        : PLACES.slice(0, 14);

      title.textContent = filter ? `${list.length} résultat(s)` : 'Lieux suggérés';

      if (!list.length) {
        results.innerHTML = `<p class="small muted" style="padding:var(--sp-4);text-align:center">Aucun lieu trouvé. Touchez la carte pour placer un point.</p>`;
        return;
      }

      results.innerHTML = list
        .map(
          (p) => `
          <button class="pick-item" data-place="${escape(p.name)}" data-lat="${p.lat}" data-lon="${p.lon}" data-street="${escape(p.street || '')}">
            <span class="order-icon">${icon(placeIcon(p.cat), { size: 18 })}</span>
            <span class="grow" style="min-width:0">
              <span class="semibold truncate" style="display:block">${escape(p.name)}</span>
              <span class="small muted truncate" style="display:block">${escape(p.street || p.commune)}</span>
            </span>
            <span class="pick-check">${icon('check', { size: 15, stroke: 3 })}</span>
          </button>`
        )
        .join('');

      $$('[data-place]', results).forEach((btn) => {
        btn.addEventListener('click', () => {
          const lat = Number(btn.dataset.lat);
          const lon = Number(btn.dataset.lon);
          draftPoint.lat = lat;
          draftPoint.lon = lon;
          draftPoint.name = btn.dataset.place;
          draftPoint.street = btn.dataset.street;
          placePin(lat, lon);
          syncConfirm();
          highlightSelected();
        });
      });
      highlightSelected();
    }

    /** Marque visuellement le lieu sélectionné dans la liste. */
    function highlightSelected() {
      $$('[data-place]', results).forEach((btn) => {
        btn.classList.toggle('is-selected', btn.dataset.place === draftPoint.name);
      });
    }

    renderPlaces('');

    /* ---- Recherche ---- */
    const search = root.querySelector('#pointSearch');
    search?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      renderPlaces(q.length >= 2 ? q : '');
      if (q.length >= 2) expandList(true);
    });

    /* ---- Replier / déployer la liste ---- */
    const list = root.querySelector('.pick-list');
    const toggle = root.querySelector('#toggleList');

    function expandList(open) {
      list.classList.toggle('is-collapsed', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Replier la liste' : 'Déplier la liste');
      toggle.innerHTML = icon(open ? 'chevron-up' : 'chevron-down', { size: 18 });
    }

    toggle?.addEventListener('click', () => {
      expandList(list.classList.contains('is-collapsed'));
    });

    /* ---- Confirmation ---- */
    confirmBtn?.addEventListener('click', () => {
      if (!draftPoint.name) return;

      const other = isPickup ? draft.dropoff : draft.pickup;
      if (other) {
        const dist = billedDistance(other, draftPoint);
        if (dist < 0.3) {
          toast('Le retrait et la livraison ne peuvent pas être au même endroit', { type: 'error' });
          return;
        }
      }

      updateDraft(
        isPickup
          ? { pickup: { ...draftPoint, contactName: '', contactPhone: '' } }
          : { dropoff: { ...draftPoint, contactName: '', contactPhone: '' } }
      );

      // Feuille de contact
      const sheet = openSheet({
        title: isPickup ? 'Contact expéditeur' : 'Contact destinataire',
        container: app.phoneEl,
        content: `
          ${field({
            id: 'contactName',
            label: 'Nom complet',
            control: `<input class="input" id="contactName" placeholder="Ex. Marie Kalala" autocomplete="name">`,
          })}
          ${field({
            id: 'contactPhone',
            label: 'Téléphone',
            hint: 'Format congolais : +243 8XX XXX XXX',
            control: `<input class="input" id="contactPhone" type="tel" inputmode="tel" placeholder="+243 81 234 567" autocomplete="tel">`,
          })}
        `,
        footer: `<button class="btn btn-primary btn-block btn-lg" data-sheet-confirm>Continuer</button>`,
      });

      sheet.element.querySelector('[data-sheet-confirm]')?.addEventListener('click', () => {
        const name = sheet.element.querySelector('#contactName')?.value.trim() || '';
        const tel = sheet.element.querySelector('#contactPhone')?.value.trim() || '';
        if (!name) {
          toast('Indiquez le nom du contact', { type: 'error' });
          return;
        }
        const patch = isPickup
          ? { pickup: { ...getState().draft.pickup, contactName: name, contactPhone: tel } }
          : { dropoff: { ...getState().draft.dropoff, contactName: name, contactPhone: tel } };
        updateDraft(patch);
        sheet.close();

        if (isPickup) {
          app.router.push('pick-point', { role: 'dropoff' });
        } else {
          app.router.push('package');
        }
      });
    });

    syncConfirm();
  },
});

/** Icône adaptée à la catégorie du lieu. */
function placeIcon(cat) {
  const map = {
    marche: 'shopping-basket',
    place: 'map-pin',
    rondpoint: 'map-pin',
    stade: 'bolt',
    eglise: 'map-pin',
    universite: 'briefcase',
    hopital: 'shieldCheck',
    aeroport: 'navigation',
    centre: 'shopping-basket',
    gare: 'map-pin',
    parc: 'map-pin',
    palais: 'briefcase',
    mairie: 'briefcase',
  };
  return map[cat] || 'map-pin';
}

/* ------------------------------------------------------------------ */
/* TYPE DE COLIS                                                       */
/* ------------------------------------------------------------------ */

export const packageScreen = (app) => ({
  id: 'package',
  hideTabbar: true,

  render() {
    const draft = getState().draft;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Que transportez-vous ?</div>
          <div class="appbar-sub">Le type détermine le véhicule proposé</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <div class="stack gap-2" role="radiogroup" aria-label="Type de colis">
          ${CONFIG.packageTypes
            .map(
              (t) => `
            <button class="check-card" role="radio" aria-checked="${draft.packageType === t.id}" data-pkg="${t.id}" style="width:100%;text-align:left">
              <span class="check-mark">${icon('check', { size: 13, stroke: 3 })}</span>
              <span class="grow">
                <span class="between">
                  <span class="semibold">${escape(t.label)}</span>
                  <span class="small muted">${t.weight[0]}–${t.weight[1]} kg</span>
                </span>
                <span class="small muted" style="display:block;margin-top:2px">${escape(t.desc)}</span>
              </span>
              <span style="color:var(--ink-400);flex-shrink:0">${icon(t.icon, { size: 20 })}</span>
            </button>`
            )
            .join('')}
        </div>

        <div style="margin-top:var(--sp-5)">
          ${field({
            id: 'weightKg',
            label: 'Poids approximatif',
            hint: 'Au-delà de 20 kg, une moto ne convient plus',
            control: `
              <div class="row gap-3">
                <input class="input" id="weightKg" type="number" inputmode="decimal" min="0" max="1200" value="${draft.weightKg}" style="flex:1">
                <span class="semibold" style="flex:0 0 auto">kg</span>
              </div>`,
          })}
        </div>

        <div style="margin-top:var(--sp-4)">
          ${field({
            id: 'photo',
            label: 'Photo du colis (facultatif)',
            hint: 'Aide le livreur à préparer son véhicule',
            control: `
              <button class="btn btn-secondary btn-block" id="addPhoto">
                ${icon('camera', { size: 18 })} <span>Prendre une photo</span>
              </button>
              <div id="photoPreview" style="margin-top:var(--sp-2);display:none"></div>`,
          })}
        </div>

        <div style="margin-top:var(--sp-4)">
          ${field({
            id: 'note',
            label: 'Note au livreur',
            hint: 'Instructions particulières, code de l’immeuble…',
            control: `<textarea class="textarea" id="note" placeholder="Ex. Sonner à l’interphone, remise au gardien">${escape(draft.note)}</textarea>`,
          })}
        </div>
      </div>

      <footer class="screen-footer">
        <button class="btn btn-primary btn-block btn-lg" data-next>
          Choisir le véhicule ${icon('arrow-right', { size: 18 })}
        </button>
      </footer>
    `;
  },

  mount(root) {
    const draft = getState().draft;

    $$('[data-pkg]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = CONFIG.packageTypes.find((t) => t.id === btn.dataset.pkg);
        updateDraft({
          packageType: type.id,
          fragile: type.id === 'fragile',
          volume: type.volume,
          // Le poids suggéré reste dans la plage du type choisi
          weightKg: Math.min(Math.max(draft.weightKg, type.weight[0]), type.weight[1]),
        });
        $$('[data-pkg]', root).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      });
    });

    const weight = root.querySelector('#weightKg');
    weight?.addEventListener('change', () => {
      const w = Math.max(0, Number(weight.value) || 0);
      updateDraft({ weightKg: w });
      // Un poids > 20 kg change le véhicule recommandé
      if (w > CONFIG.pricing.motoWeightLimitKg && getState().draft.vehicleId === 'moto') {
        toast('Colis lourd : un tricycle sera proposé', { iconName: 'alert' });
      }
    });

    const photoBtn = root.querySelector('#addPhoto');
    photoBtn?.addEventListener('click', () => {
      // Photo simulée : on simule la prise de vue avec un dégradé et une icône
      const preview = root.querySelector('#photoPreview');
      preview.style.display = 'block';
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3);background:var(--brand-050);border-radius:var(--r-md)">
          <span style="display:grid;place-items:center;width:44px;height:44px;border-radius:var(--r-sm);background:var(--brand-200);color:var(--brand-700)">${icon('image', { size: 22 })}</span>
          <span class="grow">
            <span class="semibold small" style="display:block">colis_2026-11-17.jpg</span>
            <span class="xsmall muted">Photo simulée · 1,2 Mo</span>
          </span>
          <button class="icon-btn" id="rmPhoto" aria-label="Retirer la photo">${icon('x', { size: 18 })}</button>
        </div>`;
      updateDraft({ photo: 'colis_2026-11-17.jpg' });
      preview.querySelector('#rmPhoto')?.addEventListener('click', () => {
        preview.style.display = 'none';
        preview.innerHTML = '';
        updateDraft({ photo: null });
      });
      toast('Photo ajoutée', { type: 'success', iconName: 'check' });
    });

    root.querySelector('#note')?.addEventListener('change', (e) => {
      updateDraft({ note: e.target.value });
    });

    root.querySelector('[data-next]')?.addEventListener('click', () => {
      updateDraft({ note: root.querySelector('#note').value });
      app.router.push('vehicle');
    });
  },
});

/* ------------------------------------------------------------------ */
/* CHOIX DU VÉHICULE                                                   */
/* ------------------------------------------------------------------ */

export const vehicleScreen = (app) => ({
  id: 'vehicle',
  hideTabbar: true,

  render() {
    const draft = getState().draft;
    const pkg = {
      weightKg: draft.weightKg,
      volume: draft.volume,
      fragile: draft.fragile,
    };

    const quotes = {};
    for (const id of VEHICLE_ORDER) {
      quotes[id] = quote({
        pickup: draft.pickup || { lat: CONFIG.map.center[0], lon: CONFIG.map.center[1] },
        dropoff: draft.dropoff || { lat: CONFIG.map.center[0] + 0.02, lon: CONFIG.map.center[1] + 0.02 },
        vehicleId: id,
        weightKg: pkg.weightKg,
        volume: pkg.volume,
        fragile: pkg.fragile,
      });
    }

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Quel véhicule ?</div>
          <div class="appbar-sub">${escape(draft.pickup?.name || '')} → ${escape(draft.dropoff?.name || '')}</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <div id="vehicleWarnings"></div>

        <div class="stack gap-3" role="radiogroup" aria-label="Type de véhicule">
          ${VEHICLE_ORDER.map((id) => vehicleCardHtml(id, quotes[id], draft)).join('')}
        </div>

        <div id="vehicleOptions" style="margin-top:var(--sp-4)"></div>
      </div>

      <footer class="screen-footer">
        <div class="between" style="margin-bottom:var(--sp-3)">
          <div>
            <div class="xsmall muted">Total estimé</div>
            <div class="amount amount-md" id="vehicleTotal">—</div>
          </div>
          <div style="text-align:right">
            <div class="xsmall muted">Arrivée estimated</div>
            <div class="semibold" id="vehicleEta">—</div>
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" data-next>Continuer</button>
      </footer>
    `;
  },

  mount(root) {
    const draft = getState().draft;
    const pkg = { weightKg: draft.weightKg, volume: draft.volume, fragile: draft.fragile };

    function computeQuote(vehicleId) {
      return quote({
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        vehicleId,
        weightKg: pkg.weightKg,
        volume: pkg.volume,
        fragile: pkg.fragile,
      });
    }

    /* ---- Avertissements contextuels ---- */
    function renderWarnings(vehicleId) {
      const host = root.querySelector('#vehicleWarnings');
      const warn = vehicleWarning(pkg, vehicleId);
      const dist = billedDistance(draft.pickup, draft.dropoff);

      const parts = [];

      if (warn) {
        const suggestion = warn.suggestion
          ? `<button class="btn btn-soft btn-sm" data-suggest="${warn.suggestion}">Voir le ${VEHICLES[warn.suggestion].name.toLowerCase()}</button>`
          : '';
        parts.push(notice('warning', warn.title, warn.text, suggestion));
      }

      if (vehicleId === 'tricycle' && needsLongDistanceVehicle(dist)) {
        parts.push(
          notice(
            'info',
            'Trajet long',
            `Ce trajet fait ${fmtKm(dist)}. Une voiture ou une camionnette sera plus confortable sur cette distance.`
          )
        );
      }

      host.innerHTML = parts.join('');
      $$('[data-suggest]', host).forEach((btn) => {
        btn.addEventListener('click', () => selectVehicle(btn.dataset.suggest));
      });
    }

    /* ---- Sélection d'un véhicule ---- */
    function selectVehicle(vehicleId) {
      updateDraft({ vehicleId });
      const q = computeQuote(vehicleId);

      $$('[data-vehicle]', root).forEach((card) => {
        card.setAttribute('aria-checked', String(card.dataset.vehicle === vehicleId));
      });

      // Le prix change avec une petite animation
      const total = root.querySelector('#vehicleTotal');
      total.classList.remove('price-flash');
      void total.offsetWidth;
      total.textContent = money(q.total);
      total.classList.add('price-flash');

      root.querySelector('#vehicleEta').textContent =
        `${fmtMinutes(arrivalMinutes(q.distanceKm, vehicleId))} · ${fmtKm(q.distanceKm)}`;

      renderWarnings(vehicleId);
      renderOptions(vehicleId);
    }

    /* ---- Options propres au véhicule ---- */
    function renderOptions(vehicleId) {
      const host = root.querySelector('#vehicleOptions');
      const spec = VEHICLES[vehicleId];
      const opts = spec.options || [];

      if (!opts.length) {
        host.innerHTML = '';
        return;
      }

      host.innerHTML = `
        <h3 style="margin-bottom:var(--sp-2)">Options ${escape(spec.name.toLowerCase())}</h3>
        <div class="stack gap-2">
          ${opts
            .map(
              (o) => `
            <button class="check-card" role="checkbox" aria-checked="${draft.vehicleOptions.includes(o.id)}" data-option="${o.id}" style="width:100%;text-align:left">
              <span class="check-mark">${icon('check', { size: 13, stroke: 3 })}</span>
              <span class="grow">
                <span class="between">
                  <span class="semibold">${escape(o.label)}</span>
                  <span class="small semibold" style="color:var(--text-brand)">+${money(CONFIG.pricing.surcharges[o.surcharge])}</span>
                </span>
                <span class="small muted" style="display:block;margin-top:2px">${escape(o.desc)}</span>
              </span>
              <span style="color:var(--ink-400);flex-shrink:0">${icon(o.icon, { size: 20 })}</span>
            </button>`
            )
            .join('')}
        </div>`;

      $$('[data-option]', host).forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.option;
          const list = getState().draft.vehicleOptions;
          const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
          updateDraft({ vehicleOptions: next });
          btn.setAttribute('aria-checked', String(next.includes(id)));
          selectVehicle(getState().draft.vehicleId);
        });
      });
    }

    /* ---- Initialisation ---- */
    let initial = draft.vehicleId;
    // Si le colis ne convient pas au véhicule par défaut, on propose le bon
    const warn = vehicleWarning(pkg, initial);
    if (warn && warn.suggestion) initial = warn.suggestion;

    selectVehicle(initial);
    root.querySelector('#vehicleTotal').classList.remove('price-flash');

    root.querySelector('[data-next]')?.addEventListener('click', () => {
      const q = computeQuote(getState().draft.vehicleId);
      updateDraft({ vehicleOptions: getState().draft.vehicleOptions });
      app.router.push('options', { quote: q });
    });
  },
});

/** HTML d'une carte véhicule. */
function vehicleCardHtml(id, q, draft) {
  const spec = VEHICLES[id];
  const selected = draft.vehicleId === id;
  const eta = arrivalMinutes(q.distanceKm, id);

  return `
    <button class="vehicle-card" role="radio" aria-checked="${selected}" data-vehicle="${id}" style="width:100%;text-align:left">
      ${spec.badge ? `<span class="badge badge-dark vehicle-tag">${escape(spec.badge)}</span>` : ''}
      <span class="vehicle-art">${vehicleIllustration(id, 44)}</span>
      <span style="min-width:0">
        <span class="vehicle-name">${escape(spec.name)}</span>
        <span class="vehicle-meta">
          <span>${icon('weight', { size: 13 })} ${escape(spec.capacityLabel)}</span>
          <span>${icon('clock', { size: 13 })} ${escape(spec.etaLabel)}</span>
        </span>
        <span class="vehicle-price">
          <span class="vehicle-price-value" data-price-for="${id}">${money(q.total)}</span>
          <span class="vehicle-price-unit">· ${fmtKm(q.distanceKm)}</span>
        </span>
        <span class="vehicle-meta" style="margin-top:2px">
          <span>${icon('bolt', { size: 13 })} Arrivée ~${fmtMinutes(eta)}</span>
          <span>${icon('users', { size: 13 })} ${countDrivers(id)} livreurs</span>
        </span>
      </span>
    </button>
  `;
}

/** Nombre de livreurs disponibles par type de véhicule (données simulées). */
function countDrivers(vehicleId) {
  const counts = { moto: 3, tricycle: 3, voiture: 2, camionnette: 2 };
  return counts[vehicleId] ?? 0;
}

/* ------------------------------------------------------------------ */
/* OPTIONS                                                             */
/* ------------------------------------------------------------------ */

export const optionsScreen = (app) => ({
  id: 'options',
  hideTabbar: true,

  render() {
    const draft = getState().draft;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Options</div>
          <div class="appbar-sub">Ajustez votre course</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <!-- Programmation -->
        <h3 style="margin-bottom:var(--sp-2)">Quand ?</h3>
        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="between" style="gap:var(--sp-3)">
            <div class="grow">
              <div class="semibold">Livraison immédiate</div>
              <div class="small muted">Un livreur est recherché maintenant</div>
            </div>
            <button class="switch" role="switch" aria-checked="${!draft.scheduled}" id="swImmediate" aria-label="Livraison immédiate"></button>
          </div>

          <div id="scheduleBlock" style="margin-top:var(--sp-4);${draft.scheduled ? '' : 'display:none'}">
            <div class="stack gap-3">
              ${field({
                id: 'scheduleDate',
                label: 'Date',
                control: `<input class="input" id="scheduleDate" type="date" value="${draft.scheduledAt ? draft.scheduledAt.slice(0, 10) : ''}">`,
              })}
              ${field({
                id: 'scheduleTime',
                label: 'Heure',
                control: `<input class="input" id="scheduleTime" type="time" value="${draft.scheduledAt ? draft.scheduledAt.slice(11, 16) : '14:00'}">`,
              })}
            </div>
          </div>
        </div>

        <!-- Prestation -->
        <h3 style="margin-bottom:var(--sp-2)">Prestation</h3>
        <div class="stack gap-2" style="margin-bottom:var(--sp-4)">
          ${optionCardHtml('helpLoad', 'Aide au chargement', 'Une personne supplémentaire pour charger', 'users', CONFIG.pricing.surcharges.aideChargement, draft.helpLoad)}
          ${optionCardHtml('secondPerson', '2e personne pour manutention', 'Renfort pour les charges lourdes', 'user-plus', CONFIG.pricing.surcharges.deuxiemePersonne, draft.secondPerson)}
          ${optionCardHtml('insurance', 'Assurance colis', 'Couverture en cas de perte ou de casse (+5 %)', 'shieldCheck', 0, draft.insurance)}
          ${optionCardHtml('payOnDelivery', 'Paiement à la livraison', 'Payez en espèces au livreur', 'cash', 0, draft.payOnDelivery)}
        </div>

        <!-- Code promo -->
        <h3 style="margin-bottom:var(--sp-2)">Code promo</h3>
        <div class="row gap-2">
          <input class="input grow" id="promoCode" placeholder="KULUNA10" value="${escape(draft.promoCode)}" style="text-transform:uppercase">
          <button class="btn btn-secondary" id="applyPromo">Appliquer</button>
        </div>
        <div id="promoMsg" style="margin-top:var(--sp-2)"></div>
      </div>

      <footer class="screen-footer">
        <button class="btn btn-primary btn-block btn-lg" data-next>Récapitulatif et paiement</button>
      </footer>
    `;
  },

  mount(root) {
    const draft = getState().draft;

    /* ---- Programmation ---- */
    const sw = root.querySelector('#swImmediate');
    const scheduleBlock = root.querySelector('#scheduleBlock');
    sw?.addEventListener('click', () => {
      const nowScheduled = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', String(!nowScheduled));
      scheduleBlock.style.display = nowScheduled ? 'block' : 'none';
      updateDraft({ scheduled: nowScheduled });
    });

    const dateInput = root.querySelector('#scheduleDate');
    const timeInput = root.querySelector('#scheduleTime');
    const saveSchedule = () => {
      if (!dateInput.value) return;
      updateDraft({ scheduledAt: `${dateInput.value}T${timeInput.value || '14:00'}:00` });
    };
    dateInput?.addEventListener('change', saveSchedule);
    timeInput?.addEventListener('change', saveSchedule);

    /* ---- Options ---- */
    $$('[data-option]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.option;
        const current = Boolean(getState().draft[key]);
        updateDraft({ [key]: !current });
        btn.setAttribute('aria-checked', String(!current));
      });
    });

    /* ---- Code promo ---- */
    root.querySelector('#applyPromo')?.addEventListener('click', () => {
      const code = root.querySelector('#promoCode').value.trim().toUpperCase();
      updateDraft({ promoCode: code });
      const msg = root.querySelector('#promoMsg');
      const q = quote({
        pickup: getState().draft.pickup,
        dropoff: getState().draft.dropoff,
        vehicleId: getState().draft.vehicleId,
        weightKg: getState().draft.weightKg,
        volume: getState().draft.volume,
        fragile: getState().draft.fragile,
        options: getState().draft.vehicleOptions,
        helpLoad: getState().draft.helpLoad,
        secondPerson: getState().draft.secondPerson,
        insurance: getState().draft.insurance,
        promoCode: code,
      });
      if (q.promoError) {
        msg.innerHTML = notice('danger', 'Code invalide', q.promoError);
      } else {
        msg.innerHTML = notice('success', 'Code appliqué', `Remise de ${money(q.discount)} appliquée.`);
      }
    });

    root.querySelector('[data-next]')?.addEventListener('click', () => {
      updateDraft({ promoCode: root.querySelector('#promoCode').value.trim().toUpperCase() });
      app.router.push('summary');
    });
  },
});

/** HTML d'une carte d'option. */
function optionCardHtml(id, label, desc, iconName, price, checked) {
  return `
    <button class="check-card" role="checkbox" aria-checked="${checked}" data-option="${id}" style="width:100%;text-align:left">
      <span class="check-mark">${icon('check', { size: 13, stroke: 3 })}</span>
      <span class="grow">
        <span class="semibold">${escape(label)}</span>
        <span class="small muted" style="display:block;margin-top:2px">${escape(desc)}</span>
      </span>
      <span style="text-align:right;flex-shrink:0">
        ${price ? `<span class="small semibold" style="display:block;color:var(--text-brand)">+${money(price)}</span>` : ''}
        <span style="color:var(--ink-400)">${icon(iconName, { size: 20 })}</span>
      </span>
    </button>`;
}

/* ------------------------------------------------------------------ */
/* RÉCAPITULATIF + PAIEMENT                                            */
/* ------------------------------------------------------------------ */

export const summaryScreen = (app) => ({
  id: 'summary',
  hideTabbar: true,

  render() {
    const s = getState();
    const d = s.draft;
    // Un état incomplet (point non encore choisi) ne doit pas faire planter
    // l'écran : on retombe sur le centre de Kinshasa.
    const fallback = { lat: CONFIG.map.center[0], lon: CONFIG.map.center[1] };
    const q = quote({
      pickup: d.pickup || fallback,
      dropoff: d.dropoff || fallback,
      vehicleId: d.vehicleId,
      weightKg: d.weightKg,
      volume: d.volume,
      fragile: d.fragile,
      options: d.vehicleOptions,
      helpLoad: d.helpLoad,
      secondPerson: d.secondPerson,
      insurance: d.insurance,
      promoCode: d.promoCode,
    });
    const spec = VEHICLES[d.vehicleId];
    const pkg = CONFIG.packageTypes.find((t) => t.id === d.packageType);

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">Récapitulatif</div>
          <div class="appbar-sub">Vérifiez avant de payer</div>
        </div>
      </header>

      <div class="screen-body screen-body-pad">
        <!-- Trajet -->
        <div class="card" style="margin-bottom:var(--sp-4)">
          <div class="route-line">
            <div class="route-point">
              <span class="route-marker">A</span>
              <span>
                <span class="semibold small" style="display:block">${escape(d.pickup?.name || '—')}</span>
                <span class="xsmall muted" style="display:block">${escape(d.pickup?.street || '')}</span>
                ${d.pickup?.contactName ? `<span class="xsmall muted" style="display:block">${icon('user', { size: 11 })} ${escape(d.pickup.contactName)}</span>` : ''}
              </span>
            </div>
            <div class="route-connector"></div>
            <div class="route-point">
              <span class="route-marker is-dest">B</span>
              <span>
                <span class="semibold small" style="display:block">${escape(d.dropoff?.name || '—')}</span>
                <span class="xsmall muted" style="display:block">${escape(d.dropoff?.street || '')}</span>
                ${d.dropoff?.contactName ? `<span class="xsmall muted" style="display:block">${icon('user', { size: 11 })} ${escape(d.dropoff.contactName)}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="divider" style="margin:var(--sp-3) 0"></div>
          <div class="between">
            <span class="row gap-2">
              <span style="color:var(--ink-500)">${icon(spec.id === 'moto' ? 'motorcycle' : spec.id === 'tricycle' ? 'tricycle' : spec.id === 'voiture' ? 'car' : 'van', { size: 18 })}</span>
              <span class="small semibold">${escape(spec.name)}</span>
            </span>
            <span class="small muted">${escape(pkg?.label || '')} · ${d.weightKg} kg</span>
          </div>
          <div class="between" style="margin-top:var(--sp-2)">
            <span class="row gap-2">
              <span style="color:var(--ink-500)">${icon('route', { size: 18 })}</span>
              <span class="small semibold">${fmtKm(q.distanceKm)}</span>
            </span>
            <span class="small muted">${d.scheduled ? `Programmée ${d.scheduledAt ? d.scheduledAt.slice(11, 16) : ''}` : 'Immédiate'}</span>
          </div>
          ${d.note ? `<div class="notice notice-info" style="margin-top:var(--sp-3)"><span class="notice-icon">${icon('message', { size: 16 })}</span><span>${escape(d.note)}</span></div>` : ''}
        </div>

        <!-- Détail du prix -->
        <div class="card" style="margin-bottom:var(--sp-4)">
          <dl style="margin:0">
            <div class="line-item">
              <dt>Course de base<br><span class="xsmall muted">${fmtKm(q.distanceKm)} × ${money(q.perKm)}</span></dt>
              <dd>${money(q.base + q.distanceCost)}</dd>
            </div>
            ${q.surcharges.map((sc) => `<div class="line-item"><dt>${escape(sc.label)}</dt><dd>${money(sc.amount)}</dd></div>`).join('')}
            ${q.insurance ? `<div class="line-item"><dt>Assurance colis <span class="xsmall muted">(5 %)</span></dt><dd>${money(q.insurance)}</dd></div>` : ''}
            ${q.discount ? `<div class="line-item"><dt style="color:var(--success)">Code promo</dt><dd style="color:var(--success)">−${money(q.discount)}</dd></div>` : ''}
            ${q.minimumApplied ? `<div class="line-item"><dt class="xsmall muted">Minimum de course appliqué</dt><dd class="xsmall muted">${money(VEHICLES[d.vehicleId].min)}</dd></div>` : ''}
            <div class="line-item line-total"><dt>Total</dt><dd class="amount amount-md">${money(q.total)}</dd></div>
          </dl>
        </div>

        <!-- Paiement -->
        <h3 style="margin-bottom:var(--sp-2)">Mode de paiement</h3>
        <div class="stack gap-2" role="radiogroup" aria-label="Mode de paiement">
          ${CONFIG.paymentMethods
            .map((pm) => {
              const disabled = pm.id === 'portefeuille' ? ' data-disabled="true"' : '';
              return `
              <button class="check-card" role="radio" aria-checked="${d.paymentMethod === pm.id}" data-pay="${pm.id}"${disabled} style="width:100%;text-align:left">
                <span class="check-mark">${icon('check', { size: 13, stroke: 3 })}</span>
                <span class="grow">
                  <span class="semibold">${escape(pm.label)}</span>
                  <span class="small muted" style="display:block;margin-top:2px">${escape(pm.sub)}</span>
                </span>
                ${pm.color ? `<span style="flex-shrink:0;display:grid;place-items:center;width:36px;height:36px;border-radius:var(--r-sm);background:${pm.color};color:#fff;font-weight:800;font-size:11px">${escape(pm.logo.slice(0, 2).toUpperCase())}</span>` : `<span style="color:var(--ink-400);flex-shrink:0">${icon(pm.logo === 'cash' ? 'cash' : 'wallet', { size: 20 })}</span>`}
              </button>`;
            })
            .join('')}
        </div>
        <p class="xsmall muted" style="margin-top:var(--sp-2);text-align:center">
          ${icon('info', { size: 12 })} Paiement simulé — aucun débit réel
        </p>
      </div>

      <footer class="screen-footer">
        <div class="between" style="margin-bottom:var(--sp-3)">
          <span class="muted">Total à payer</span>
          <span class="amount amount-md" id="summaryTotal">${money(q.total)}</span>
        </div>
        <button class="btn btn-primary btn-block btn-lg" id="payBtn">
          ${icon('shieldCheck', { size: 18 })} <span>Payer ${money(q.total)}</span>
        </button>
      </footer>
    `;
  },

  mount(root) {
    const d = getState().draft;

    $$('[data-pay]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.disabled) {
          toast('Portefeuille insuffisant', { type: 'error' });
          return;
        }
        updateDraft({ paymentMethod: btn.dataset.pay });
        $$('[data-pay]', root).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      });
    });

    root.querySelector('#payBtn')?.addEventListener('click', () => {
      const q = quote({
        pickup: d.pickup,
        dropoff: d.dropoff,
        vehicleId: d.vehicleId,
        weightKg: d.weightKg,
        volume: d.volume,
        fragile: d.fragile,
        options: d.vehicleOptions,
        helpLoad: d.helpLoad,
        secondPerson: d.secondPerson,
        insurance: d.insurance,
        promoCode: d.promoCode,
      });

      const order = {
        id: 'DX-' + Math.floor(1000 + Math.random() * 8999),
        status: 'recherche',
        createdAt: new Date().toISOString(),
        service: d.service,
        vehicle: d.vehicleId,
        vehicleOptions: d.vehicleOptions,
        packageType: d.packageType,
        weightKg: d.weightKg,
        volume: d.volume,
        fragile: d.fragile,
        pickup: d.pickup,
        dropoff: d.dropoff,
        extraStops: d.extraStops,
        contacts: {
          pickup: d.pickup?.contactName ? `${d.pickup.contactName}${d.pickup.contactPhone ? ' (' + fmtPhone(d.pickup.contactPhone) + ')' : ''}` : '',
          dropoff: d.dropoff?.contactName ? `${d.dropoff.contactName}${d.dropoff.contactPhone ? ' (' + fmtPhone(d.dropoff.contactPhone) + ')' : ''}` : '',
        },
        note: d.note,
        photo: d.photo,
        priceCdf: q.total,
        quote: q,
        driverId: null,
        driverName: null,
        etaMinutes: arrivalMinutes(q.distanceKm, d.vehicleId),
        code: String(Math.floor(100000 + Math.random() * 899999)),
        payment: d.paymentMethod,
        hasInsurance: d.insurance,
        payOnDelivery: d.payOnDelivery,
        scheduled: d.scheduled,
        scheduledAt: d.scheduledAt,
      };

      setState({ activeOrder: order });
      app.router.push('search-driver');
    });
  },
});

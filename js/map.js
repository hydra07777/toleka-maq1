/**
 * MAP — encapsulation de Leaflet.
 *
 * Leaflet et les tuiles OSM sont les SEULES dépendances réseau de la
 * maquette. Tout le reste (interface, données, animations) fonctionne
 * hors connexion. Si Leaflet n'est pas chargé, l'application affiche
 * une carte de repli stylisée et continue de fonctionner.
 */

import CONFIG from '../config/app.config.js';
import { icon } from './icons.js';

let L = null;
const instances = new Map();

/** Charge Leaflet une seule fois. Renvoie la promesse de disponibilité. */
let leafletPromise = null;

export function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve) => {
    if (window.L) {
      L = window.L;
      resolve(true);
      return;
    }
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      L = ok ? window.L : null;
      resolve(ok);
    };

    /* Leaflet est auto-hébergé (vendor/leaflet.js) : pas de CDN, donc pas
       de lenteur ni d'échec de chargement. Le CSS est lié dans index.html.
       Si le script local est absent, on tente le CDN en secours. */
    const script = document.createElement('script');
    script.src = 'vendor/leaflet.js';
    script.onload = () => finish(Boolean(window.L));
    script.onerror = () => {
      const cdn = document.createElement('script');
      cdn.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      cdn.onload = () => finish(Boolean(window.L));
      cdn.onerror = () => finish(false);
      document.head.appendChild(cdn);
    };
    document.head.appendChild(script);

    // Filet de sécurité : au bout de 6 s, on déclare Leaflet indisponible
    setTimeout(() => finish(Boolean(window.L)), 6000);
  });
  return leafletPromise;
}

/**
 * Attend que Leaflet soit disponible.
 *
 * CRUCIAL : les écrans sont montés immédiatement au démarrage, alors que
 * Leaflet arrive en réseau (CDN). Si `createMap` est appelé trop tôt, il
 * renvoie null et l'écran bascule sur la carte de repli — définitivement,
 * car rien ne réessaie ensuite. C'est le bug « je clique un lieu, rien ne
 * se passe » : pas de carte = pas de marqueur = rien à voir.
 *
 * Les écrans DOIVENT donc await cette promesse avant de créer leur carte.
 *
 * @returns {Promise<boolean>} true si Leaflet est prêt
 */
export function whenReady() {
  return loadLeaflet();
}

/**
 * Crée (ou récupère) une carte dans un conteneur.
 * @param {string|HTMLElement} container
 * @param {object} [opts]
 * @returns {object|null} instance Leaflet, ou null si indisponible
 */
export function createMap(container, opts = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return null;

  /* Clé unique par CONTENEUR, pas par id HTML.
     Le même id (`#homeMap`) est réutilisé d'un rendu d'écran à l'autre :
     avec une clé par id, la nouvelle instance réutiliserait l'ancienne,
     qui pointe vers un nœud retiré du DOM — carte invisible ou fantôme.
     On indexe donc par l'objet DOM lui-même. */
  const key = el;

  // Instance encore attachée à ce conteneur : on la réutilise.
  const cached = instances.get(key);
  if (cached) {
    const cachedEl = cached.getContainer?.();
    if (cachedEl === el) return cached;
    try {
      cached.remove();
    } catch (e) {
      /* déjà détruite */
    }
    instances.delete(key);
  }

  if (!L) return null;

  const map = L.map(el, {
    center: opts.center || CONFIG.map.center,
    zoom: opts.zoom ?? CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    maxZoom: CONFIG.map.maxZoom,
    zoomControl: false,
    attributionControl: true,
    preferCanvas: false,
  });

  L.tileLayer(CONFIG.map.tileUrl, {
    attribution: CONFIG.map.attribution,
    maxZoom: CONFIG.map.maxZoom,
  }).addTo(map);

  /* Leaflet lit la taille du conteneur UNE fois, à la création. Si le
     conteneur est dimensionné par le flexbox (comme .pick-map-wrap) ou
     change de taille ensuite (liste repliée, rotation, barre d'onglets),
     les tuiles restent positionnées sur l'ancienne taille : la carte
     apparaît grise ou décalée.

     Un ResizeObserver + invalidateSize règle le cas de façon fiable. */
  if (typeof ResizeObserver !== 'undefined') {
    let pending = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(recalc, 80);
    });
    ro.observe(el);
    map._resizeObserver = ro;
  }

  /* Recalcul de la taille de la carte.

     Deux pièges corrigés ici :
     1. on ne rappelle invalidateSize que si la taille RÉELLE diffère de
        celle que Leaflet connaît, sinon chaque appel annule l'animation
        d'apparition des tuiles (elles restent à opacité 0) ;
     2. après un invalidateSize, Leaflet recrée les tuiles. Si elles sont
        déjà en cache navigateur, l'événement `load` ne se déclenche plus
        et la tuile reste bloquée à opacité 0 (carte grise). On les force
        donc visibles si elles sont bel et bien chargées. */
  function recalc() {
    try {
      const el = map.getContainer();
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const known = map.getSize();
      if (Math.abs(known.x - w) >= 1 || Math.abs(known.y - h) >= 1) {
        map.invalidateSize({ animate: false });
      }
    } catch (e) {
      /* carte détruite */
      return;
    }
    revealLoadedTiles(map);
  }

  /* Leaflet n'ajoute la classe `leaflet-tile-loaded` que sur l'événement
     `load` de l'image. Une tuile servie depuis le cache navigateur ne
     rejoue pas cet événement : elle reste `visibility: hidden` (carte
     grise). On force donc l'ajout de la classe à intervalle court le
     temps que le calque se remplisse. */
  function revealLoop(durationMs = 5000) {
    const started = Date.now();
    const tick = () => {
      if (Date.now() - started > durationMs) return;
      revealLoadedTiles(map);
      setTimeout(tick, 150);
    };
    tick();
  }

  /* Première passe : le conteneur est souvent dimensionné par le flexbox,
     qui n'a pas encore résolu ses contraintes au moment où Leaflet lit
     la taille. */
  requestAnimationFrame(recalc);
  setTimeout(recalc, 200);

  instances.set(key, map);

  revealLoop(5000);

  return map;
}

/** Supprime une carte (libère la mémoire). */
export function destroyMap(container) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  const map = instances.get(el);
  if (map) {
    map.remove();
    instances.delete(el);
  }
}

/**
 * Force l'affichage des tuiles déjà chargées.
 *
 * Leaflet fait apparaître ses tuiles via une transition d'opacité pilotée
 * par l'événement `load` de l'image. Après un `invalidateSize`, les
 * tuiles recréées peuvent être déjà en cache navigateur : l'événement
 * `load` ne se rejoue pas, la tuile reste à opacité 0 et la carte
 * reste grise. On la révèle donc explicitement.
 *
 * @param {object} map instance Leaflet
 */
export function revealLoadedTiles(map) {
  if (!map || !map.getContainer) return;
  const tiles = map.getContainer().querySelectorAll('.leaflet-tile');
  tiles.forEach((tile) => {
    if (tile.complete && tile.naturalWidth > 0) {
      tile.style.opacity = '1';
      // Leaflet masque les tuiles via `.leaflet-tile:not(.leaflet-tile-loaded)`
      // (visibility: hidden). Sans cette classe, la tuile reste invisible
      // même chargée : c'est le symptôme « carte grise ».
      tile.classList.add('leaflet-tile-loaded');
    }
  });
}

/**
 * Surveille le chargement des tuiles pendant quelques secondes.
 *
 * Une tuile déjà en cache navigateur ne rejoue pas son événement `load` :
 * Leaflet la laisse donc à opacité 0 (carte grise). On relance la révélation
 * à intervalle court le temps que le calque de tuiles se remplisse.
 *
 * @param {object} map instance Leaflet
 * @param {number} [durationMs]
 */
export function watchTiles(map, durationMs = 4000) {
  if (!map || !map.getContainer) return;
  const started = Date.now();
  const tick = () => {
    if (Date.now() - started > durationMs) return;
    revealLoadedTiles(map);
    setTimeout(tick, 200);
  };
  tick();
}

/**
 * Redimensionne toutes les cartes vivantes.
 * Leaflet ne recalcule pas automatiquement la taille quand le conteneur
 * change de dimensions (écran empilé, feuille ouverte, rotation) : les
 * tuiles restent décalées ou la moitié de la carte reste grise.
 */
export function refreshAllMaps() {
  instances.forEach((map) => {
    try {
      map.invalidateSize({ animate: false });
      revealLoadedTiles(map);
    } catch (e) {
      /* carte détruite entre-temps */
    }
  });
}

/**
 * Recadre la carte sur des coordonnées.
 *
 * Après un déplacement, Leaflet recrée les tuiles. Celles servies depuis
 * le cache navigateur ne rejouent pas leur événement `load` : Leaflet
 * les laisse à `visibility: hidden` et la carte devient grise.
 * On les révèle donc après le déplacement.
 */
export function setView(map, lat, lon, zoom) {
  if (!map) return;
  map.setView([lat, lon], zoom ?? map.getZoom());
  revealLoadedTiles(map);
  setTimeout(() => revealLoadedTiles(map), 250);
  setTimeout(() => revealLoadedTiles(map), 600);
}

/** Recadre la carte pour englober plusieurs points. */
export function fitBounds(map, points, padding = 56) {
  if (!map || !points.length) return;
  const bounds = points.map((p) => [p.lat, p.lon]);
  map.fitBounds(bounds, { padding: [padding, padding] });
  revealLoadedTiles(map);
  setTimeout(() => revealLoadedTiles(map), 250);
  setTimeout(() => revealLoadedTiles(map), 600);
}

/* ------------------------------------------------------------------ */
/* Marqueurs                                                           */
/* ------------------------------------------------------------------ */

/**
 * Crée un marqueur avec l'icône maison.
 * @param {'pick'|'dropoff'|'driver'|'stop'} kind
 */
export function createIcon(kind, opts = {}) {
  if (!L) return null;
  const { size = 'md' } = opts;
  const cls = size === 'sm' ? ' pin-sm' : size === 'lg' ? ' pin-lg' : '';
  const iconName = kind === 'driver' ? 'navigation' : kind === 'dropoff' ? 'map-pin' : 'map-pin';
  const html = `<div class="pin pin-${kind}${cls}">${icon(iconName, { size: size === 'sm' ? 13 : size === 'lg' ? 22 : 17, stroke: 2 })}</div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: size === 'sm' ? [26, 26] : size === 'lg' ? [44, 44] : [34, 34],
    iconAnchor: size === 'sm' ? [13, 13] : size === 'lg' ? [22, 22] : [17, 17],
  });
}

/**
 * Ajoute un marqueur sur la carte.
 * @returns {object|null} marqueur Leaflet
 */
export function addMarker(map, lat, lon, kind = 'pick', opts = {}) {
  if (!map) return null;
  const marker = L.marker([lat, lon], {
    icon: createIcon(kind, opts),
    zIndexOffset: kind === 'driver' ? 1000 : 0,
  }).addTo(map);
  return marker;
}

/** Déplace un marqueur. */
export function moveMarker(marker, lat, lon) {
  if (!marker) return;
  marker.setLatLng([lat, lon]);
}

/** Retire un marqueur. */
export function removeMarker(marker) {
  if (marker && marker.remove) marker.remove();
}

/**
 * Trace une route (polyligne) entre des points.
 * @returns {object|null} polyline
 */
export function drawRoute(map, points, opts = {}) {
  if (!map || !points.length) return null;
  const latlngs = points.map((p) => [p.lat, p.lon]);
  const line = L.polyline(latlngs, {
    color: opts.color || '#0E9F6E',
    weight: opts.weight || 4,
    opacity: opts.opacity || 0.9,
    dashArray: opts.dashArray || null,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);
  return line;
}

/**
 * Carte de repli quand Leaflet est indisponible (hors connexion).
 * @param {HTMLElement} container
 */
export function renderFallbackMap(container) {
  const fallback = document.createElement('div');
  fallback.style.cssText =
    'position:absolute;inset:0;display:grid;place-items:center;background:' +
    'linear-gradient(160deg,#eefaf5 0%,#e9edec 55%,#dde3e1 100%);color:#7d8a86;text-align:center;padding:var(--sp-6);font-size:var(--fs-sm)';
  fallback.innerHTML =
    '<div>' +
    '<div style="margin-bottom:var(--sp-3);opacity:.6">' +
    icon('map-pin', { size: 34 }) +
    '</div>' +
    '<strong style="display:block;color:#3d4a45;margin-bottom:4px">Carte indisponible hors connexion</strong>' +
    '<span>Reconnectez-vous pour afficher la carte de Kinshasa.</span>' +
    '</div>';
  container.appendChild(fallback);
  return fallback;
}

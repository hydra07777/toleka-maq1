/**
 * APP — orchestrateur.
 *
 * Assemble la coquille (téléphone, barre d'état, onglets), enregistre les
 * écrans, gère la navigation globale et les actions transverses
 * (bascule client/livreur, acceptation d'une course côté livreur).
 */

import CONFIG from '../config/app.config.js';
import { Router, createStatusBar } from './router.js';
import { getState, setState, subscribe } from './store.js';
import { icon } from './icons.js';
import { escape, money } from './format.js';
import { toast, openModal } from './ui.js';
import { loadLeaflet } from './map.js';
import { showInvitation as showFullscreenInvitation } from './fullscreen.js';
import { billedDistance } from './geo.js';
import { matchingDrivers } from '../data/drivers.js';

import { splashScreen, onboardingScreen, loginScreen, otpScreen, profileScreen, profileSubScreen } from './screens/auth.js';
import { homeScreen, pickPointScreen, packageScreen, vehicleScreen, optionsScreen, summaryScreen } from './screens/client.js';
import { searchDriverScreen, driverFoundScreen, trackingScreen, ratingScreen, receiptScreen, historyScreen, orderDetailScreen, notificationsScreen } from './screens/flow.js';
import { driverSignupScreen, driverHomeScreen, driverNavScreen, driverEarningsScreen, buildOfferPopup } from './screens/driver.js';

/* ------------------------------------------------------------------ */
/* Coquille                                                            */
/* ------------------------------------------------------------------ */

class App {
  constructor() {
    this.phoneEl = document.getElementById('phone');
    this.screenHost = document.getElementById('screenHost');
    this.statusBar = createStatusBar();
    this.phoneEl.appendChild(this.statusBar);

    this.router = new Router(this.screenHost, this.statusBar);
    this.tabbarEl = null;
    this.tracker = null;
    this.maps = new Map();

    this.registerScreens();
    this.buildTabbar();
    this.bindGlobal();
    this.watchLayout();
  }

  /**
   * Adapte la maquette à la taille RÉELLE du cadre.
   *
   * Un media query sur la fenêtre ne suffit pas : la maquette peut être
   * affichée dans une fenêtre de bureau étroite (le cadre téléphone reste
   * alors visible) ou sur un vrai mobile (le cadre doit prendre tout
   * l'écran, sans bordure ni barre d'état simulée).
   *
   * On mesure donc le cadre lui-même.
   */
  watchLayout() {
    const apply = () => {
      const rect = this.phoneEl.getBoundingClientRect();
      // Plein écran si le cadre occupe toute la fenêtre
      const fullscreen =
        rect.width >= window.innerWidth - 2 && rect.height >= window.innerHeight - 2;

      this.phoneEl.classList.toggle('is-fullscreen', fullscreen);
    };

    apply();
    window.addEventListener('resize', apply);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(apply).observe(this.phoneEl);
    }
  }

  /* -------------------------------------------------------------- */
  /* Enregistrement des écrans                                       */
  /* -------------------------------------------------------------- */
  registerScreens() {
    const r = this.router;
    r.register(splashScreen(this));
    r.register(onboardingScreen(this));
    r.register(loginScreen(this));
    r.register(otpScreen(this));
    r.register(profileScreen(this));
    r.register(profileSubScreen(this));
    r.register(homeScreen(this));
    r.register(pickPointScreen(this));
    r.register(packageScreen(this));
    r.register(vehicleScreen(this));
    r.register(optionsScreen(this));
    r.register(summaryScreen(this));
    r.register(searchDriverScreen(this));
    r.register(driverFoundScreen(this));
    r.register(trackingScreen(this));
    r.register(ratingScreen(this));
    r.register(receiptScreen(this));
    r.register(historyScreen(this));
    r.register(notificationsScreen(this));
    r.register(orderDetailScreen(this));
    r.register(driverSignupScreen(this));
    r.register(driverHomeScreen(this));
    r.register(driverNavScreen(this));
    r.register(driverEarningsScreen(this));

    // Transitions douces entre écrans voisins
    r.transition('vehicle', 'options', 'screen-enter-right');
    r.transition('options', 'summary', 'screen-enter-right');
    r.transition('summary', 'search-driver', 'screen-fade');
    r.transition('search-driver', 'driver-found', 'screen-fade');
    r.transition('driver-found', 'tracking', 'screen-fade');
    r.transition('tracking', 'rating', 'screen-enter-up');
    r.transition('rating', 'receipt', 'screen-fade');
    r.transition('home', 'history', 'screen-enter-right');
    r.transition('history', 'order-detail', 'screen-enter-right');
  }

  /* -------------------------------------------------------------- */
  /* Barre d'onglets                                                */
  /* -------------------------------------------------------------- */
  buildTabbar() {
    this.tabbarEl = document.createElement('nav');
    this.tabbarEl.className = 'tabbar';
    this.tabbarEl.setAttribute('aria-label', 'Navigation principale');
    this.phoneEl.appendChild(this.tabbarEl);
    this.renderTabbar();
  }

  renderTabbar() {
    if (!this.tabbarEl) return;
    const isDriver = getState().mode === 'livreur';

    const tabs = isDriver
      ? [
          { id: 'driver-home', icon: 'bolt', label: 'Courses' },
          { id: 'driver-earnings', icon: 'wallet', label: 'Gains' },
          { id: 'profile', icon: 'user', label: 'Profil' },
        ]
      : [
          { id: 'home', icon: 'home', label: 'Accueil' },
          { id: 'history', icon: 'history', label: 'Commandes' },
          { id: 'profile', icon: 'user', label: 'Profil' },
        ];

    this.tabbarEl.innerHTML = tabs
      .map(
        (t) => `
        <button class="tab" data-tab="${t.id}">
          <span class="tab-icon">${icon(t.icon, { size: 21 })}</span>
          <span>${escape(t.label)}</span>
        </button>`
      )
      .join('');

    const current = this.router.current?.id;
    $$('[data-tab]', this.tabbarEl).forEach((btn) => {
      const on = btn.dataset.tab === current;
      btn.setAttribute('aria-current', on ? 'page' : 'false');
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        if (id === current) return;
        setState({ lastTab: id });
        this.router.replace(id);
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Actions globales                                               */
  /* -------------------------------------------------------------- */
  bindGlobal() {
    // Bouton retour : delegates sur tout le document
    document.addEventListener('click', (e) => {
      const back = e.target.closest('[data-back]');
      if (back) {
        e.preventDefault();
        if (!this.router.back()) this.router.reset('home');
        return;
      }

      // Liens vers un écran
      const go = e.target.closest('[data-go]');
      if (go) {
        e.preventDefault();
        this.router.push(go.dataset.go);
        return;
      }

      // Ligne de commande
      const order = e.target.closest('[data-order]');
      if (order) {
        e.preventDefault();
        this.router.push('order-detail', { id: order.dataset.order });
      }
    });

    // Mise à jour de la barre d'onglets à chaque changement d'écran
    window.addEventListener('route:changed', (e) => {
      this.renderTabbar();

      /* Certains écrans ont un pied d'action (bouton « Confirmer »,
         « Payer »…). La barre d'onglets passerait AU-DESSUS et
         rendrait ce bouton inaccessible au doigt : on la masque. */
      const screen = this.router.screens.get(e.detail?.id);
      this.tabbarEl.classList.toggle('is-hidden', Boolean(screen?.hideTabbar));
    });

    // Changement de devise : on rerend l'écran courant
    window.addEventListener('currency:changed', () => {
      const cur = this.router.current;
      if (cur && !cur.id.startsWith('driver')) {
        this.router.replace(cur.id, cur.params);
      }
    });

    // Le mode change : on reconstruit la barre d'onglets
    subscribe((s) => {
      if (s.mode !== this.lastMode) {
        this.lastMode = s.mode;
        this.renderTabbar();
      }
    });
  }

  /**
   * Bascule entre le mode client et le mode livreur.
   * @param {'client'|'livreur'} mode
   */
  switchMode(mode) {
    setState({ mode });
    this.lastMode = mode;
    this.renderTabbar();

    if (mode === 'livreur') {
      const s = getState();
      if (!s.driver.signupComplete) {
        this.router.reset('driver-signup');
      } else {
        this.router.reset('driver-home');
      }
    } else {
      this.router.reset('home');
    }
    toast(mode === 'livreur' ? 'Mode livreur activé' : 'Mode client activé', { iconName: mode === 'livreur' ? 'briefcase' : 'user' });
  }

  /* -------------------------------------------------------------- */
  /* Aides                                                          */
  /* -------------------------------------------------------------- */

  /** HTML d'une ligne de commande (utilisé par plusieurs écrans). */
  orderRowHtml(order) {
    const statusMap = {
      en_cours: { label: 'En cours', cls: 'badge-brand' },
      recherche: { label: 'Recherche', cls: 'badge-info' },
      terminee: { label: 'Livrée', cls: 'badge-success' },
      annulee: { label: 'Annulée', cls: 'badge-danger' },
    };
    const st = statusMap[order.status] || statusMap.en_cours;
    const iconName =
      order.service === 'courses' ? 'shopping-basket' : order.service === 'documents' ? 'file-text' : 'package';

    return `
      <button class="order-row" data-order="${escape(order.id)}" style="width:100%;text-align:left">
        <span class="order-icon">${icon(iconName, { size: 20 })}</span>
        <span class="grow" style="min-width:0">
          <span class="between" style="gap:var(--sp-2)">
            <span class="semibold truncate">${escape(order.pickup?.name || 'Course')}</span>
            <span class="badge ${st.cls}">${st.label}</span>
          </span>
          <span class="small muted truncate" style="display:block">
            vers ${escape(order.dropoff?.name || '—')} · ${money(order.priceCdf || 0)}
          </span>
        </span>
      </button>`;
  }

  /** Branche les clics sur les lignes de commande d'un conteneur. */
  bindOrderRows(root) {
    // La délégation globale s'en charge déjà ; on garde la méthode pour la clarté.
    void root;
  }

  /** Mémorise une carte pour pouvoir la libérer. */
  rememberMap(key, map) {
    if (map) this.maps.set(key, map);
  }

  /** Fin du suivi : on passe à la notation. */
  finishTracking(order) {
    if (!order) {
      this.router.replace('home');
      return;
    }
    setState({ activeOrder: { ...order, status: 'en_cours' } });
    this.router.replace('rating');
  }

  /* -------------------------------------------------------------- */
  /* Mode livreur : demande entrante                                */
  /* -------------------------------------------------------------- */
  showDriverOffer(host) {
    const s = getState();
    if (!s.driver.isOnline || !host) return;

    // On construit une demande compatible avec le véhicule du livreur
    const profile = s.driver.profile;
    const vehicleId = profile?.vehicle || 'moto';
    const pickup = { lat: -4.34249, lon: 15.27776, name: 'Big Market' };
    const dropoff = { lat: -4.31034, lon: 15.28117, name: 'place de l’indépendance' };
    const distanceKm = billedDistance(pickup, dropoff);

    /* La commande cliente en cours.
       Si elle existe, l'offre du livreur doit porter le MÊME code de
       confirmation : c'est le client qui le donne au livreur, et le livreur
       le saisit pour prouver la livraison. Deux codes générés séparément
       rendraient la validation impossible. */
    const activeOrder = getState().activeOrder;

    const offer = {
      id: activeOrder?.id || 'DX-' + Math.floor(1000 + Math.random() * 8999),
      pickup: activeOrder?.pickup || pickup,
      dropoff: activeOrder?.dropoff || { ...dropoff, contactName: 'Client' },
      vehicle: vehicleId,
      weightKg: vehicleId === 'moto' ? 2 : 35,
      packageLabel: vehicleId === 'moto' ? 'Petit colis' : 'Carton',
      distanceKm,
      gainCdf: Math.round(distanceKm * (vehicleId === 'moto' ? 700 : 1500) * 0.75),
      // Même code que celui affiché au client dans l'écran de suivi
      code: activeOrder?.code || String(Math.floor(100000 + Math.random() * 899999)),
      clientName: activeOrder?.contacts?.dropoff || 'Client',
    };

    const seconds = CONFIG.timing.driverOfferSeconds;
    const circumference = 2 * Math.PI * 24;

    /* L'offre est enregistrée dès son affichage : le code de confirmation
       doit être connu de la maquette AVANT que le livreur ne l'accepte.
       (C'est aussi ce que lit le présentateur pour la démonstration.) */
    setState((st) => ({
      driver: { ...st.driver, currentOffer: offer },
    }));

    host.innerHTML = buildOfferPopup(offer, seconds, () => acceptOffer(offer), () => refuseOffer());

    // Minuteur
    let left = seconds;
    const value = host.querySelector('#timerValue');
    const bar = host.querySelector('.timer-ring .bar');
    const ring = host.querySelector('#offerTimer');
    value.textContent = left;

    const timer = setInterval(() => {
      left -= 1;
      if (value) value.textContent = Math.max(0, left);
      if (bar) bar.style.strokeDashoffset = String(circumference * (1 - left / seconds));
      if (ring) ring.classList.toggle('is-low', left <= 5);
      if (left <= 0) {
        clearInterval(timer);
        refuseOffer();
      }
    }, 1000);

    // `this` n'est pas lié dans une function() imbriquée : on capture
    // l'instance dans une constante avant de définir les callbacks.
    const router = this.router;

    function acceptOffer() {
      clearInterval(timer);
      host.innerHTML = '';
      // L'offre (et son code) a déjà été enregistrée à l'affichage :
      // on ne fait que passer à l'étape de navigation.
      setState((st) => ({ driver: { ...st.driver, currentOffer: offer, navStep: 0 } }));
      toast('Course acceptée — dirigez-vous vers le retrait', { type: 'success', iconName: 'check' });
      router.push('driver-nav');
    }

    function refuseOffer() {
      clearInterval(timer);
      host.innerHTML = '';
      toast('Demande refusée', { iconName: 'x' });
    }

    host.querySelector('#acceptBtn')?.addEventListener('click', acceptOffer);
    host.querySelector('#refuseBtn')?.addEventListener('click', refuseOffer);
  }
}

/* ------------------------------------------------------------------ */
/* Utilitaire local (évite d'importer tout le module UI)              */
/* ------------------------------------------------------------------ */
function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */

async function boot() {
  const app = new App();
  window.__app = app; // utile pour le débogage et les tests manuels

  /* Leaflet est chargé depuis le CDN. On attend qu'il soit prêt AVANT
     d'afficher le premier écran : sinon l'écran d'accueil monte sans
     carte, bascule sur la carte de repli, et plus rien ne réessaie.
     Sans réseau, le délai de 6 s de loadLeaflet() garantit qu'on continue
     quand même avec la carte de repli. */
  await loadLeaflet();

  const s = getState();
  /* Le mode livreur n'est restauré que si l'inscription a été faite :
     sinon l'application démarrerait sur un écran vide. */
  if (s.mode === 'livreur' && s.driver.signupComplete) {
    app.router.reset('driver-home');
  } else {
    app.router.reset('splash');
  }

  /* Invitation au plein écran.

     Le navigateur n'accepte `requestFullscreen()` que sur un geste
     utilisateur : un appel automatique au chargement est refusé. On
     affiche donc une invitation cliquable, seulement là où le plein
     écran a du sens (petit écran), et une seule fois. */
  inviteFullscreen();
}

/**
 * Propose le plein écran si le contexte s'y prête.
 *
 * Sur un écran d'ordinateur, le cadre téléphone centré est plus confortable
 * que le plein écran : on n'invite donc que sur les petits écrans (mobile /
 * tablette), où la maquette doit occuper tout l'espace.
 */
function inviteFullscreen() {
  const isSmallScreen = window.innerWidth <= 820 || window.innerHeight <= 700;
  if (!isSmallScreen) return;

  showFullscreenInvitation({
    container: document.body,
    onAccept: (ok) => {
      if (!ok) {
        // Le navigateur a refusé : on ne réessaiera pas de la session.
        try {
          localStorage.setItem('delivery-express-fullscreen-dismissed', '1');
        } catch (e) { /* stockage indisponible */ }
      }
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export default App;

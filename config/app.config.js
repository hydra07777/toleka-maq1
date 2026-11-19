/**
 * ============================================================================
 *  DELIVERY EXPRESS — CONFIGURATION CENTRALE
 * ============================================================================
 *  C'est LE fichier à modifier pour personnaliser la maquette.
 *  Nom de l'app, thème, devise, tarifs, seuils de véhicule, catégories de
 *  colis, moyens de paiement : tout est ici.
 *
 *  Aucun autre fichier ne doit contenir de valeur métier en dur.
 * ============================================================================
 */

export const CONFIG = {
  /* ------------------------------------------------------------------ */
  /* Identité                                                            */
  /* ------------------------------------------------------------------ */
  app: {
    name: 'TOLEKA',
    fullName: 'TOLEKA Delivery',
    shortName: 'Toleka',
    tagline: 'Colis & courses, partout à Kinshasa',
    version: '1.0.0',
    // Congolais : préfixe national utilisé pour l'affichage des téléphones
    phonePrefix: '+243',
    country: 'RDC',
    city: 'Kinshasa',
  },

  /* ------------------------------------------------------------------ */
  /* Devises                                                             */
  /* ------------------------------------------------------------------ */
  currency: {
    default: 'CDF',
    available: ['CDF', 'USD'],
    // Taux de conversion fixe pour la maquette (1 USD = X CDF)
    rates: { CDF: 1, USD: 2500 },
    // Format d'affichage : "3 500 CDF" / "$1.40"
    format: {
      CDF: (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' CDF',
      USD: (n) => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n),
    },
  },

  /* ------------------------------------------------------------------ */
  /* Tarification (simulée — modifiable)                                  */
  /* ------------------------------------------------------------------ */
  pricing: {
    // Distance minimale facturée (km) : un trajet intra-ville est court mais
    // long en temps réel à Kinshasa.
    minDistanceKm: 2,
    // Distance maximale facturée (au-delà : tarif plafonné sur cette distance)
    maxBilledDistanceKm: 30,
    // Marge de sécurité sur la distance OSM réelle (routes sinueuses, détours)
    distanceSafetyFactor: 1.25,
    // Prix du kilomètre supplémentaire au-delà de la distance incluse
    extraKmCdf: 300,

    vehicles: {
      moto: {
        base: 2000,
        perKm: 700,
        min: 3000,
      },
      tricycle: {
        base: 5000,
        perKm: 1500,
        min: 8000,
      },
      voiture: {
        base: 8000,
        perKm: 2500,
        min: 10000,
      },
      camionnette: {
        base: 15000,
        perKm: 4000,
        min: 20000,
      },
    },

    // Suppléments (tous en CDF)
    surcharges: {
      aideChargement: 1000,      // aide au chargement / déchargement
      deuxiemePersonne: 2000,    // 2e personne pour manutention
      heurePointe: 1500,         // majoration 17h-19h / 6h-8h
      pluie: 1000,               // conditions météo dégradées
      isotherme: 500,            // box isotherme (option véhicule)
      remiseMainPropre: 800,     // remise en main propre uniquement
      bache: 700,                // bâche de protection (tricycle)
      distanceLongue: 2000,      // au-delà de 15 km
      volume: 1500,              // colis volumineux
      fragile: 1200,             // colis fragile (assurance renforcée)
    },

    // Seuil au-delà duquel on suggère un véhicule plus grand (km)
    longDistanceThresholdKm: 15,
    // Seuil de poids au-delà duquel la moto est inadaptée (kg)
    motoWeightLimitKg: 20,
    // Poids max par véhicule (kg) — sert au filtrage de compatibilité livreur
    vehicleCapacityKg: {
      moto: 20,
      tricycle: 300,
      voiture: 400,
      camionnette: 1200,
    },
  },

  /* ------------------------------------------------------------------ */
  /* Types de colis                                                       */
  /* ------------------------------------------------------------------ */
  packageTypes: [
    {
      id: 'document',
      label: 'Document',
      desc: 'Papiers, contrats, courriers',
      icon: 'file-text',
      weight: [0, 2],
      volume: 'light',
      vehicle: 'moto',
    },
    {
      id: 'petit-colis',
      label: 'Petit colis',
      desc: 'Enveloppe épaisse, accessoires',
      icon: 'package',
      weight: [0, 5],
      volume: 'light',
      vehicle: 'moto',
    },
    {
      id: 'carton',
      label: 'Carton',
      desc: 'Boîte de marchandise',
      icon: 'box',
      weight: [5, 25],
      volume: 'medium',
      vehicle: 'tricycle',
    },
    {
      id: 'gros-objet',
      label: 'Gros objet',
      desc: 'Meuble, électroménager',
      icon: 'package-open',
      weight: [25, 300],
      volume: 'large',
      vehicle: 'tricycle',
    },
    {
      id: 'fragile',
      label: 'Fragile',
      desc: 'Verre, écran, appareillage',
      icon: 'glass-water',
      weight: [0, 15],
      volume: 'medium',
      vehicle: 'moto',
      surcharge: 'fragile',
    },
  ],

  /* ------------------------------------------------------------------ */
  /* Moyens de paiement (tous simulés)                                    */
  /* ------------------------------------------------------------------ */
  paymentMethods: [
    { id: 'm-pesa',    label: 'M-Pesa',        sub: 'MTN Mobile Money', color: '#FFCC00', logo: 'm-pesa' },
    { id: 'airtel',    label: 'Airtel Money',  sub: 'Airtel RDC',      color: '#E4002B', logo: 'airtel' },
    { id: 'orange',    label: 'Orange Money',  sub: 'Orange RDC',      color: '#FF6600', logo: 'orange' },
    { id: 'especes',   label: 'Espèces',       sub: 'Paiement à la livraison', color: null, logo: 'cash' },
    { id: 'portefeuille', label: 'Portefeuille', sub: 'Solde TOLEKA', color: null, logo: 'wallet' },
  ],

  /* ------------------------------------------------------------------ */
  /* Carte                                                               */
  /* ------------------------------------------------------------------ */
  map: {
    center: [-4.3150, 15.2900],
    zoom: 13,
    minZoom: 11,
    maxZoom: 18,
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    // Zoom par défaut lors du choix d'un point sur la carte
    pickZoom: 15,
  },

  /* ------------------------------------------------------------------ */
  /* Délais de simulation                                                 */
  /* ------------------------------------------------------------------ */
  timing: {
    // Délai d'arrivée annoncé par véhicule (minutes) pour une distance donnée
    etaBaseMinutes: 4,
    etaPerKmMinutes: 1.6,
    etaPerVehicle: {
      moto: 0,
      tricycle: 4,
      voiture: 6,
      camionnette: 9,
    },
    // Durée du minuteur d'acceptation côté livreur (secondes)
    driverOfferSeconds: 15,
    // Durée de l'animation de recherche de livreur (secondes)
    searchSeconds: 4,
    // Vitesse de simulation du marqueur (ms par étape d'animation)
    trackingTickMs: 900,
  },

  /* ------------------------------------------------------------------ */
  /* Notes & commissions                                                  */
  /* ------------------------------------------------------------------ */
  ratings: {
    driverMinimum: 4.0,
    driverMaximum: 5.0,
    // Pourboires proposés en CDF
    tips: [500, 1000, 2000, 5000],
  },

  /* ------------------------------------------------------------------ */
  /* Thème (les tokens CSS sont dans css/tokens.css)                     */
  /* ------------------------------------------------------------------ */
  theme: {
    // Montserrat : la famille du logotype TOLEKA. Auto-hébergée (css/fonts.css),
    // donc l'interface reste lisible même sans réseau.
    fontFamily: "'Montserrat', 'Segoe UI', system-ui, -apple-system, sans-serif",
    brandFontFamily: "'Toleka Display', 'Montserrat', system-ui, sans-serif",
    // Chemins des assets de marque produits par tools/extract-brand.py
    brand: {
      mark: 'assets/brand/logo-mark.svg',
      wordmark: 'assets/brand/logo-wordmark.svg',
      logo: 'assets/brand/logo-full.svg',
      stacked: 'assets/brand/logo-stacked.svg',
      icon: 'assets/brand/icon.svg',
    },
  },
};

export default CONFIG;

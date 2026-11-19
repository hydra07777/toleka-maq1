/**
 * VÉHICULES — spécifications, capacités, options propres à chaque type.
 * Les prix de base sont dans config/app.config.js (tarification).
 * Ce fichier décrit le VÉHICULE, pas le prix.
 */

export const VEHICLES = {
  moto: {
    id: 'moto',
    name: 'Moto',
    tagline: 'Le plus rapide',
    badge: 'Le plus rapide',
    featured: true,
    capacityKg: 20,
    capacityLabel: 'Jusqu’à 20 kg',
    volume: 'Sac ou top-case — pas de colis volumineux',
    etaLabel: 'Arrive en 5 à 10 min',
    etaMinutes: [5, 10],
    speedKmh: 28,
    usage: ['Documents', 'Petits colis', 'Repas', 'Courses légères', 'Pharmacie'],
    strengths: [
      'Passe dans les embouteillages',
      'Prix le plus bas',
      'Trouve un chemin même quand tout est bloqué',
    ],
    limits: ['Pas de colis volumineux', 'Pas plus de 20 kg'],
    // Options proposées UNIQUEMENT pour la moto
    options: [
      {
        id: 'isotherme',
        label: 'Livreur avec box isotherme',
        desc: 'Conserve la température — ideal pour la nourriture',
        surcharge: 'isotherme',
        icon: 'thermometer-snowflake',
      },
      {
        id: 'main-propre',
        label: 'Remise en main propre uniquement',
        desc: 'Le livreur doit vous remettre le colis en personne',
        surcharge: 'remiseMainPropre',
        icon: 'hand',
      },
    ],
  },

  tricycle: {
    id: 'tricycle',
    name: 'Tricycle',
    tagline: 'Idéal pour les charges',
    badge: 'Idéal pour les charges',
    featured: true,
    capacityKg: 300,
    capacityLabel: '150 à 300 kg',
    volume: 'Bac de chargement ouvert ou bâché',
    etaLabel: 'Arrive en 10 à 20 min',
    etaMinutes: [10, 20],
    speedKmh: 18,
    usage: ['Cartons', 'Sacs de marchandises', 'Petits meubles', 'Commandes de commerçants', 'Marché'],
    strengths: [
      'Emporte une charge lourde sans problème',
      'Bac ouvert : monte un meuble sans le charger à la main',
      'Rentable pour les volumes',
    ],
    limits: ['Plus lent en heure de pointe', 'Nécessite un accès manoeuvrable'],
    options: [
      {
        id: 'aide-chargement',
        label: 'Aide au chargement / déchargement',
        desc: 'Une deuxième personne pour monter et descendre la charge',
        surcharge: 'aideChargement',
        icon: 'users',
      },
      {
        id: 'bache',
        label: 'Bâche de protection',
        desc: 'Protège la marchandise de la pluie et de la poussière',
        surcharge: 'bache',
        icon: 'cloud-rain',
      },
      {
        id: 'deuxieme-personne',
        label: '2e personne pour manutention',
        desc: 'Renfort pour les charges très lourdes ou volumineuses',
        surcharge: 'deuxiemePersonne',
        icon: 'user-plus',
      },
    ],
  },

  voiture: {
    id: 'voiture',
    name: 'Voiture',
    tagline: 'Colis moyens et fragiles',
    badge: null,
    featured: false,
    capacityKg: 400,
    capacityLabel: 'Jusqu’à 400 kg',
    volume: 'Coffre et banquette arrière',
    etaLabel: 'Arrive en 15 à 25 min',
    etaMinutes: [15, 25],
    speedKmh: 22,
    usage: ['Colis moyens', 'Objets fragiles', 'Longues distances', 'Courses en gros'],
    strengths: ['Protège les colis fragiles', 'Confortable sur les longues distances'],
    limits: ['Plus cher', 'Difficile à garer dans le centre'],
    options: [
      {
        id: 'aide-chargement',
        label: 'Aide au chargement',
        desc: 'Le livreur vous aide à charger le coffre',
        surcharge: 'aideChargement',
        icon: 'users',
      },
    ],
  },

  camionnette: {
    id: 'camionnette',
    name: 'Camionnette',
    tagline: 'Gros volumes',
    badge: null,
    featured: false,
    capacityKg: 1200,
    capacityLabel: 'Jusqu’à 1 200 kg',
    volume: 'Fourgon — déménagement léger',
    etaLabel: 'Arrive en 25 à 40 min',
    etaMinutes: [25, 40],
    speedKmh: 16,
    usage: ['Gros volumes', 'Déménagement léger', 'Mobilier', 'Commandes de commerçant'],
    strengths: ['Le plus grand volume de transport', 'Convient auxerships longs'],
    limits: ['Le plus cher', 'Nécessite une place de stationnement'],
    options: [
      {
        id: 'deuxieme-personne',
        label: '2e personne pour manutention',
        desc: 'Renfort pour le chargement et le déchargement',
        surcharge: 'deuxiemePersonne',
        icon: 'user-plus',
      },
      {
        id: 'bache',
        label: 'Bâche de protection',
        desc: 'Protège la marchandie pendant le transport',
        surcharge: 'bache',
        icon: 'cloud-rain',
      },
    ],
  },
};

/** Ordre d'affichage : les deux premiers sont mis en avant. */
export const VEHICLE_ORDER = ['moto', 'tricycle', 'voiture', 'camionnette'];

/**
 * Types d'inscription livreur — chaque type a ses propres champs.
 * Détermine aussi quelles demandes le livreur recevra.
 */
export const DRIVER_SIGNUP = {
  moto: {
    vehicle: 'moto',
    label: 'Moto',
    desc: 'Rapide, économe, idéal pour les petits colis',
    maxKg: 20,
    fields: [
      { id: 'plaque', label: 'Plaque d’immatriculation', placeholder: 'KT 1234 A', required: true },
      { id: 'permis', label: 'Numéro de permis moto', placeholder: 'CMR-0457-2211', required: true },
      { id: 'casque', label: 'Type de casque', type: 'select', required: true, options: ['Intégral', 'Semi-intégral', 'Crochet'] },
      {
        id: 'isotherme',
        label: 'Possédez-vous un box isotherme ?',
        type: 'select',
        required: true,
        options: ['Oui', 'Non'],
      },
    ],
  },
  tricycle: {
    vehicle: 'tricycle',
    label: 'Tricycle',
    desc: 'Plus de charge, pour les colis lourds et volumineux',
    maxKg: 300,
    fields: [
      { id: 'plaque', label: 'Plaque d’immatriculation', placeholder: 'KT 5678 B', required: true },
      {
        id: 'capacite',
        label: 'Capacité de charge (kg)',
        type: 'select',
        required: true,
        options: ['150 kg', '200 kg', '250 kg', '300 kg'],
      },
      {
        id: 'bache',
        label: 'Votre tricycle est-il bâché ?',
        type: 'select',
        required: true,
        options: ['Oui', 'Non'],
      },
      {
        id: 'aideChargement',
        label: 'Proposez l’aide au chargement ?',
        type: 'select',
        required: true,
        options: ['Oui', 'Non'],
      },
    ],
  },
  voiture: {
    vehicle: 'voiture',
    label: 'Voiture',
    desc: 'Colis moyens, fragiles, longues distances',
    maxKg: 400,
    fields: [
      { id: 'plaque', label: 'Plaque d’immatriculation', placeholder: 'KT 9012 C', required: true },
      { id: 'permis', label: 'Numéro de permis', placeholder: 'CD-7788-0091', required: true },
      { id: 'places', label: 'Nombre de places', type: 'select', required: true, options: ['4', '5', '7'] },
    ],
  },
  camionnette: {
    vehicle: 'camionnette',
    label: 'Camionnette',
    desc: 'Gros volumes et déménagement léger',
    maxKg: 1200,
    fields: [
      { id: 'plaque', label: 'Plaque d’immatriculation', placeholder: 'KT 3456 D', required: true },
      { id: 'permis', label: 'Numéro de permis', placeholder: 'CD-1123-4455', required: true },
      { id: 'capacite', label: 'Volume du fourgon (m³)', type: 'select', required: true, options: ['6 m³', '9 m³', '12 m³', '16 m³'] },
    ],
  },
};

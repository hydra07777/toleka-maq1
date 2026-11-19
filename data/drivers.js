/**
 * LIVREURS — 10 livreurs simulés.
 * 3 motos, 3 tricycles, 2 voitures, 2 camionnettes.
 *
 * Les photos ne sont pas des images volées : chaque livreur a un avatar
 * vectoriel généré (initiales + couleur dérivée de son id), rendu dans
 * /assets. Remplacez `photo` par un chemin réel si vous disposez de photos.
 */

export const DRIVERS = [
  /* ---------------- MOTOS (3) ---------------- */
  {
    id: 'drv-01',
    name: 'Junior Ilunga',
    vehicle: 'moto',
    vehicleName: 'Honda PCX 125',
    plate: 'KT 4821 A',
    rating: 4.9,
    reviews: 214,
    color: '#0E9F6E',
    initials: 'JI',
    zone: 'Gombe',
    photo: null,
    completedTrips: 612,
    isInsulated: true,     // possède un box isotherme
    handDelivery: false,
    canHelpLoad: false,
    yearsActive: 3,
  },
  {
    id: 'drv-02',
    name: 'Héritier Mbayo',
    vehicle: 'moto',
    vehicleName: 'Yamaha NMAX 155',
    plate: 'KT 7310 B',
    rating: 4.7,
    reviews: 158,
    color: '#1F6F8B',
    initials: 'HM',
    zone: 'Limete',
    photo: null,
    completedTrips: 389,
    isInsulated: false,
    handDelivery: true,
    canHelpLoad: false,
    yearsActive: 2,
  },
  {
    id: 'drv-03',
    name: 'Nathanaël Kalala',
    vehicle: 'moto',
    vehicleName: 'TVS Jupiter',
    plate: 'KT 2094 C',
    rating: 4.6,
    reviews: 97,
    color: '#B26B00',
    initials: 'NK',
    zone: 'Ngaliema',
    photo: null,
    completedTrips: 244,
    isInsulated: false,
    handDelivery: false,
    canHelpLoad: false,
    yearsActive: 1,
  },

  /* ---------------- TRICYCYCLES (3) ---------------- */
  {
    id: 'drv-04',
    name: 'Boris Tshimanga',
    vehicle: 'tricycle',
    vehicleName: 'Tricycle Loadé 350 kg',
    plate: 'KT 5567 D',
    rating: 4.8,
    reviews: 301,
    color: '#5B3E96',
    initials: 'BT',
    zone: 'Bandal',
    photo: null,
    completedTrips: 826,
    isInsulated: false,
    handDelivery: false,
    canHelpLoad: true,
    hasTarpaulin: true,
    capacityKg: 300,
    yearsActive: 4,
  },
  {
    id: 'drv-05',
    name: 'Patient Mukendi',
    vehicle: 'tricycle',
    vehicleName: 'Tricycle Kasi 250 kg',
    plate: 'KT 8842 E',
    rating: 4.5,
    reviews: 176,
    color: '#C2372B',
    initials: 'PM',
    zone: 'Lemba',
    photo: null,
    completedTrips: 452,
    isInsulated: false,
    handDelivery: false,
    canHelpLoad: true,
    hasTarpaulin: false,
    capacityKg: 250,
    yearsActive: 2,
  },
  {
    id: 'drv-06',
    name: 'Fabrice Lokwa',
    vehicle: 'tricycle',
    vehicleName: 'Tricycle Herman 300 kg',
    plate: 'KT 1198 F',
    rating: 4.4,
    reviews: 89,
    color: '#0C6C49',
    initials: 'FL',
    zone: 'Matete',
    photo: null,
    completedTrips: 197,
    isInsulated: false,
    handDelivery: true,
    canHelpLoad: false,
    hasTarpaulin: true,
    capacityKg: 300,
    yearsActive: 1,
  },

  /* ---------------- VOITURES (2) ---------------- */
  {
    id: 'drv-07',
    name: 'Sylvie Nsimba',
    vehicle: 'voiture',
    vehicleName: 'Toyota Corolla',
    plate: 'KT 6633 G',
    rating: 4.9,
    reviews: 412,
    color: '#1F6F8B',
    initials: 'SN',
    zone: 'Gombe',
    photo: null,
    completedTrips: 1103,
    isInsulated: false,
    handDelivery: true,
    canHelpLoad: true,
    yearsActive: 5,
  },
  {
    id: 'drv-08',
    name: 'Arnaud Bope',
    vehicle: 'voiture',
    vehicleName: 'Nissan Almera',
    plate: 'KT 3477 H',
    rating: 4.6,
    reviews: 203,
    color: '#B26B00',
    initials: 'AB',
    zone: 'Ngaliema',
    photo: null,
    completedTrips: 531,
    isInsulated: false,
    handDelivery: false,
    canHelpLoad: true,
    yearsActive: 3,
  },

  /* ---------------- CAMIONNETTES (2) ---------------- */
  {
    id: 'drv-09',
    name: 'Géraldine Kanku',
    vehicle: 'camionnette',
    vehicleName: 'Ford Transit 8 m³',
    plate: 'KT 9905 J',
    rating: 4.8,
    reviews: 267,
    color: '#5B3E96',
    initials: 'GK',
    zone: 'Kintambo',
    photo: null,
    completedTrips: 678,
    isInsulated: false,
    handDelivery: true,
    canHelpLoad: true,
    hasTarpaulin: true,
    capacityKg: 1200,
    yearsActive: 4,
  },
  {
    id: 'drv-10',
    name: 'Emmanuel Kabamba',
    vehicle: 'camionnette',
    vehicleName: 'Renault Master 12 m³',
    plate: 'KT 2244 K',
    rating: 4.7,
    reviews: 134,
    color: '#0C6C49',
    initials: 'EK',
    zone: 'Limete',
    photo: null,
    completedTrips: 312,
    isInsulated: false,
    handDelivery: false,
    canHelpLoad: true,
    hasTarpaulin: false,
    capacityKg: 1200,
    yearsActive: 2,
  },
];

/**
 * Un livreur peut-il prendre cette demande ?
 * @param {object} driver
 * @param {object} request { vehicleId, weightKg, volume, requiresHandDelivery, requiresInsulated, requiresHelpLoad }
 * @returns {{ ok: boolean, reason?: string }}
 */
export function isCompatible(driver, request) {
  const cap = driver.capacityKg || (driver.vehicle === 'moto' ? 20 : driver.vehicle === 'tricycle' ? 300 : driver.vehicle === 'voiture' ? 400 : 1200);

  if (request.weightKg > cap) {
    return { ok: false, reason: `Colis de ${request.weightKg} kg > capacité ${cap} kg` };
  }
  // Un livreur moto ne prend pas une demande de tricycle ou plus
  if (driver.vehicle !== request.vehicleId) {
    return { ok: false, reason: 'Véhicule incompatible' };
  }
  if (request.requiresInsulated && !driver.isInsulated) {
    return { ok: false, reason: 'Pas de box isotherme' };
  }
  if (request.requiresHandDelivery && !driver.handDelivery) {
    return { ok: false, reason: 'Pas de remise en main propre' };
  }
  if (request.requiresHelpLoad && !driver.canHelpLoad) {
    return { ok: false, reason: 'Pas d’aide au chargement' };
  }
  return { ok: true };
}

/** Livreurs compatibles avec une demande, triés par note. */
export function matchingDrivers(request) {
  return DRIVERS.filter((d) => isCompatible(d, request).ok).sort((a, b) => b.rating - a.rating);
}

/**
 * Retrouve un livreur par son identifiant.
 *
 * `matchingDrivers()` filtre par véhicule : un livreur déjà affecté à une
 * commande (mais de véhicule différent de celui qu'on redemande) n'y
 * serait pas. On cherche donc par id — la source de vérité.
 *
 * @param {string} id
 */
export function driverById(id) {
  return DRIVERS.find((d) => d.id === id) || null;
}

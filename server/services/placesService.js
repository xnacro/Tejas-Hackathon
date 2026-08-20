// Surakha AI - Nearby Driver & Emergency Places Intelligence Service

import { calculateHaversine } from "./routesService.js";

const DEFAULT_PLACES_REPOSITORY = [
  {
    id: "SRV-HOSP-01",
    name: "Sadar Hospital Jamui / Trauma Care",
    category: "Hospital",
    icon: "Hospital",
    address: "Station Road, Jamui, Bihar 811307",
    lat: 24.9214,
    lng: 86.2251,
    contact: "+91 6345 222102",
    rating: 4.4,
    isOpen: true,
  },
  {
    id: "SRV-HOSP-02",
    name: "AIIMS Patna Emergency Trauma Center",
    category: "Hospital",
    icon: "Hospital",
    address: "Phulwari Sharif, Patna, Bihar 801507",
    lat: 25.5606,
    lng: 85.0456,
    contact: "108 / +91 612 2451000",
    rating: 4.8,
    isOpen: true,
  },
  {
    id: "SRV-FUEL-01",
    name: "Indian Oil Swagat Highway Hub (Diesel Depot)",
    category: "Petrol Pump",
    icon: "Fuel",
    address: "NH 333 / Malaypur Road, Jamui",
    lat: 24.9450,
    lng: 86.1920,
    contact: "+91 9835 110294",
    rating: 4.6,
    isOpen: true,
  },
  {
    id: "SRV-REST-01",
    name: "Highway Oasis Truck & Driver Rest Plaza",
    category: "Rest Area",
    icon: "Bed",
    address: "NH 333 Mile 42, Jamui Bypass",
    lat: 24.9600,
    lng: 86.1750,
    contact: "+91 9431 889201",
    amenities: ["Clean Washrooms", "Dormitory", "24x7 Dhaba", "Secure Parking"],
    rating: 4.5,
    isOpen: true,
  },
  {
    id: "SRV-POL-01",
    name: "Jamui Police Station / Highway Patrol Unit",
    category: "Police",
    icon: "ShieldAlert",
    address: "Court Road, Jamui, Bihar",
    lat: 24.9250,
    lng: 86.2200,
    contact: "112 / +91 6345 222233",
    rating: 4.2,
    isOpen: true,
  },
  {
    id: "SRV-REP-01",
    name: "Sri Ram Heavy Vehicle Tyre & Mechanical Workshop",
    category: "Repair",
    icon: "Wrench",
    address: "Near Malaypur Railway Overbridge, Jamui",
    lat: 24.9580,
    lng: 86.1880,
    contact: "+91 9771 445566",
    rating: 4.3,
    isOpen: true,
  }
];

/**
 * Searches nearby driver and emergency services relative to driver coordinates.
 */
export function getNearbyServices(latitude, longitude, categoryFilter = null, maxRadiusKm = 50) {
  const userLat = latitude || 24.9528;
  const userLng = longitude || 86.1831;

  let list = DEFAULT_PLACES_REPOSITORY.map(place => {
    const distanceKm = calculateHaversine(userLat, userLng, place.lat, place.lng);
    return {
      ...place,
      distanceKm,
      distanceText: `${distanceKm} km`,
    };
  });

  if (categoryFilter && categoryFilter !== "ALL") {
    list = list.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  // Filter within radius and sort by distance
  return list
    .filter(p => p.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

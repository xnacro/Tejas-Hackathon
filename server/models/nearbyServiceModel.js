let services = [
  {
    id: "SRV-01",
    name: "Indian Oil Swagat Fuel & Rest Complex",
    type: "Petrol Pump",
    category: "fuel",
    distanceKm: 2.4,
    rating: 4.6,
    openNow: true,
    features: ["Diesel High-Flow", "Truck Parking", "Clean Washrooms", "Air Filling"],
    location: "NH 44, Mile 231",
    coordinates: { lat: 28.5390, lng: 77.3940 }
  },
  {
    id: "SRV-02",
    name: "Pahalwan Dhaba & Family Restaurant",
    type: "Restaurant",
    category: "food",
    distanceKm: 1.8,
    rating: 4.8,
    openNow: true,
    features: ["24/7 Food", "Driver Discount", "Tea/Coffee", "Large Parking"],
    location: "NH 44, Service Road",
    coordinates: { lat: 28.5330, lng: 77.3880 }
  },
  {
    id: "SRV-03",
    name: "Highway Oasis Driver Rest Area & Dormitory",
    type: "Rest Area",
    category: "rest",
    distanceKm: 5.6,
    rating: 4.5,
    openNow: true,
    features: ["Beds / Resting Pods", "Security CCTV", "Showers", "Mechanic Shop"],
    location: "NH 44, Km Marker 238",
    coordinates: { lat: 28.5600, lng: 77.4100 }
  },
  {
    id: "SRV-04",
    name: "Apex Trauma & Emergency Hospital",
    type: "Hospital",
    category: "medical",
    distanceKm: 8.2,
    rating: 4.9,
    openNow: true,
    features: ["24/7 Emergency", "ICU / Trauma Unit", "Ambulance Standby"],
    location: "Sector 62 Highway Junction",
    coordinates: { lat: 28.5800, lng: 77.4300 }
  },
  {
    id: "SRV-05",
    name: "Highway Patrol Police Station (NH-44 Unit)",
    type: "Police Station",
    category: "police",
    distanceKm: 6.3,
    rating: 4.3,
    openNow: true,
    features: ["Highway Helpdesk", "Emergency Response", "Challan Assistance"],
    location: "Toll Plaza North Outpost",
    coordinates: { lat: 28.5700, lng: 77.4200 }
  }
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export const NearbyServiceModel = {
  findAll: (category, userLat, userLng) => {
    let list = [...services];
    if (category) {
      list = list.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }

    if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
      list = list.map(s => {
        const dist = haversine(Number(userLat), Number(userLng), s.coordinates.lat, s.coordinates.lng);
        return {
          ...s,
          distanceKm: dist,
          distance: `${dist} km`
        };
      });
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return list;
  },
  findById: (id) => {
    return services.find(s => s.id === id) || null;
  },
  findNearestRestArea: (userLat, userLng) => {
    const restAreas = NearbyServiceModel.findAll("rest", userLat, userLng);
    return restAreas.length > 0 ? restAreas[0] : services[2];
  }
};


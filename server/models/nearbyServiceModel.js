let services = [
  {
    id: "SRV-REP-01",
    name: "Sri Ram Heavy Vehicle Tyre & Mechanical Workshop",
    type: "Repair",
    category: "Repair",
    distanceKm: 0.7,
    rating: 4.3,
    location: "Near Malaypur Railway Overbridge, Jamui",
    coordinates: { lat: 24.9580, lng: 86.1880 },
    open: true,
    contact: "+91 9771 445566"
  },
  {
    id: "SRV-REST-01",
    name: "Highway Oasis Truck & Driver Rest Plaza",
    type: "Rest Area",
    category: "Rest Area",
    distanceKm: 1.1,
    rating: 4.5,
    location: "NH 333 Mile 42, Jamui Bypass",
    coordinates: { lat: 24.9600, lng: 86.1750 },
    open: true,
    contact: "+91 9431 889201"
  },
  {
    id: "SRV-FUEL-01",
    name: "Indian Oil Swagat Fuel & Rest Hub (Diesel Depot)",
    type: "Petrol Pump",
    category: "Petrol Pump",
    distanceKm: 1.2,
    rating: 4.6,
    location: "NH 333 / Malaypur Road, Jamui",
    coordinates: { lat: 24.9450, lng: 86.1920 },
    open: true,
    contact: "+91 9835 110294"
  },
  {
    id: "SRV-POL-01",
    name: "Highway Patrol Police Station (Jamui Unit)",
    type: "Police Station",
    category: "Police",
    distanceKm: 4.8,
    rating: 4.2,
    location: "Court Road, Jamui, Bihar",
    coordinates: { lat: 24.9250, lng: 86.2200 },
    open: true,
    contact: "112 / +91 6345 222233"
  },
  {
    id: "SRV-HOSP-01",
    name: "Sadar Trauma & Emergency Hospital",
    type: "Hospital",
    category: "Hospital",
    distanceKm: 5.4,
    rating: 4.4,
    location: "Station Road, Jamui, Bihar 811307",
    coordinates: { lat: 24.9214, lng: 86.2251 },
    open: true,
    contact: "+91 6345 222102"
  }
];

export const NearbyServiceModel = {
  findAll: () => {
    return services;
  },
  findByCategory: (category) => {
    if (!category || category === "all") return services;
    return services.filter(s => s.type.toLowerCase().includes(category.toLowerCase()));
  }
};

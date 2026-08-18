let hazards = [
  {
    id: "HAZ-101",
    type: "Road Block",
    icon: "Construction",
    title: "Toll Plaza Construction / Road Work",
    location: "NH 44, Mile 234",
    distanceKm: 3.0,
    coordinates: { lat: 28.5355, lng: 77.3910 },
    severity: "medium",
    reporter: "Driver Ramesh (Truck KA-01)",
    reportedTime: "12 mins ago",
    upvotes: 8,
    active: true
  },
  {
    id: "HAZ-102",
    type: "Accident",
    icon: "AlertTriangle",
    title: "Overturned Lorry on Right Lane",
    location: "NH 44, Northbound near Exit 14",
    distanceKm: 1.8,
    coordinates: { lat: 28.5480, lng: 77.3980 },
    severity: "high",
    reporter: "Driver Vikram (Tanker UP-32)",
    reportedTime: "24 mins ago",
    upvotes: 19,
    active: true
  },
  {
    id: "HAZ-103",
    type: "Fog / Visibility",
    icon: "CloudFog",
    title: "Dense Smog / Low Visibility (<50m)",
    location: "Yamuna Expressway stretch",
    distanceKm: 8.5,
    coordinates: { lat: 28.5100, lng: 77.3750 },
    severity: "high",
    reporter: "Community Weather Radar",
    reportedTime: "45 mins ago",
    upvotes: 31,
    active: true
  },
  {
    id: "HAZ-104",
    type: "Pothole",
    icon: "ShieldAlert",
    title: "Deep Pothole on Left Shoulder",
    location: "NH 44, Service Lane",
    distanceKm: 4.2,
    coordinates: { lat: 28.5250, lng: 77.3820 },
    severity: "low",
    reporter: "Driver Gurpreet",
    reportedTime: "1 hour ago",
    upvotes: 14,
    active: true
  }
];

export const HazardModel = {
  findAll: () => {
    return hazards;
  },
  findById: (id) => {
    return hazards.find(h => h.id === id) || null;
  },
  create: (data) => {
    const newHazard = {
      id: `HAZ-${Date.now().toString().slice(-4)}`,
      upvotes: 1,
      reportedTime: "Just now",
      active: true,
      ...data
    };
    hazards.unshift(newHazard);
    return newHazard;
  },
  upvote: (id) => {
    const item = hazards.find(h => h.id === id);
    if (item) {
      item.upvotes += 1;
      return item;
    }
    return null;
  }
};

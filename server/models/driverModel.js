let profile = {
  id: "DRV-8821",
  name: "Rajesh Kumar",
  role: "Truck Driver",
  vehicleNumber: "UP 32 BK 8921",
  vehicleType: "Tata Prima 4028.S (Heavy Commercial)",
  weather: {
    temp: "28°C",
    condition: "Sunny / Clear Visibility",
    icon: "CloudSun"
  },
  notificationsCount: 3,
  notifications: [
    { id: 1, title: "Speed Camera Warning", desc: "NH 44 Mile 235 camera in 200m", time: "2m ago" },
    { id: 2, title: "Weather Alert", desc: "Mild crosswinds reported near Yamuna bridge", time: "15m ago" },
    { id: 3, title: "Safety Score Update", desc: "Safety streak achieved: 92/100 (+4 pts)", time: "1h ago" }
  ]
};

let telemetry = {
  speed: 52,
  speedLimit: 60,
  currentRoad: "NH 44",
  fuelLevel: 62,
  engineTemp: 87,
  tripDistance: 234.8,
  todaySummary: {
    drivingTime: "04h 32m",
    alerts: 2,
    topSpeed: 78,
    safetyScore: 92
  }
};

let communityDrivers = {
  nearbyCount: 12,
  radiusKm: 5,
  corridor: "NH 44 Northbound (Delhi-Agra Stretch)",
  activeTrucks: [
    { id: "T-1", alias: "Driver Vikram", vehicle: "Container 10-Wheeler", distanceKm: 0.8 },
    { id: "T-2", alias: "Driver Harpreet", vehicle: "Trailer", distanceKm: 1.4 },
    { id: "T-3", alias: "Driver Anil", vehicle: "Open Body Truck", distanceKm: 2.1 }
  ]
};

export const DriverModel = {
  getProfile: () => profile,
  getTelemetry: () => telemetry,
  updateTelemetry: (updates) => {
    if (updates.speed !== undefined) telemetry.speed = Number(updates.speed);
    if (updates.fuelLevel !== undefined) telemetry.fuelLevel = Number(updates.fuelLevel);
    if (updates.engineTemp !== undefined) telemetry.engineTemp = Number(updates.engineTemp);
    if (updates.tripDistance !== undefined) telemetry.tripDistance = Number(updates.tripDistance);
    return telemetry;
  },
  getCommunityDrivers: () => communityDrivers
};

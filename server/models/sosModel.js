let sosData = {
  currentCoordinates: { lat: 28.5355, lng: 77.3910 },
  currentRoad: "NH 44, Milestone 234, Noida-Agra Corridor",
  nearestHospital: {
    name: "Apex Trauma & Emergency Hospital",
    distanceKm: 8.2,
    phone: "108",
    directContact: "+91 120 4567890"
  },
  nearestPoliceStation: {
    name: "Highway Patrol Police Outpost (NH-44)",
    distanceKm: 6.3,
    phone: "112",
    directContact: "+91 120 2345678"
  },
  emergencyContacts: [
    { name: "Fleet Manager (Mr. Amit Verma)", phone: "+91 98765 43210", relation: "Fleet Operations" },
    { name: "Pooja Kumar (Spouse)", phone: "+91 98111 22334", relation: "Family" }
  ]
};

let sharedSessions = [
  { id: "SHR-1", contact: "Fleet Operations", phone: "+91 98765 43210", active: true, expiresAt: "2h remaining" },
  { id: "SHR-2", contact: "Pooja Kumar", phone: "+91 98111 22334", active: true, expiresAt: "2h remaining" }
];

export const SosModel = {
  getSosInfo: () => sosData,
  triggerSos: (incidentData) => {
    return {
      id: `SOS-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      location: incidentData.location || sosData.currentRoad,
      coordinates: incidentData.coordinates || sosData.currentCoordinates,
      status: "DISPATCHED_TO_HIGHWAY_PATROL_AND_108",
      dispatches: [
        { unit: "NHAI Highway Patrol PCR #14", status: "En Route" },
        { unit: "108 Emergency Ambulance", status: "Notified" },
        { unit: "Fleet Safety Desk", status: "Alert Broadcasted" }
      ]
    };
  },
  getSharedSessions: () => sharedSessions,
  toggleSession: (id) => {
    const session = sharedSessions.find(s => s.id === id);
    if (session) {
      session.active = !session.active;
      return session;
    }
    return null;
  }
};

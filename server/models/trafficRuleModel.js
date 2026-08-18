let trafficRulesData = [
  {
    id: "TR-UP-001",
    state: "Uttar Pradesh",
    offence: "Over Speeding (LMV/Commercial)",
    vehicle_type: "Commercial Heavy / Truck",
    road_type: "National Highway (NH 44)",
    speed_limit: 60,
    penalty: "₹2,000 - ₹4,000 (Section 183 MV Act)",
    effective_date: "2024-04-01",
    source: "MoRTH Gazette Notification S.O. 1522(E)"
  },
  {
    id: "TR-UP-002",
    state: "Uttar Pradesh",
    offence: "Dangerous Driving / Drowsy Driving",
    vehicle_type: "All Commercial Vehicles",
    road_type: "All Roads",
    speed_limit: null,
    penalty: "₹5,000 & potential license suspension",
    effective_date: "2023-09-15",
    source: "UP Transport Dept Rule 184"
  },
  {
    id: "TR-MH-001",
    state: "Maharashtra",
    offence: "Over Speeding on Expressways",
    vehicle_type: "Truck / Commercial Vehicle",
    road_type: "Expressway / NH",
    speed_limit: 80,
    penalty: "₹2,000 + 3 penalty points",
    effective_date: "2024-01-01",
    source: "Maharashtra Motor Vehicles Rules (Sec 183)"
  },
  {
    id: "TR-DL-001",
    state: "Delhi NCR",
    offence: "Lane Indiscipline / No Heavy Vehicle Lane",
    vehicle_type: "Heavy Goods Vehicle",
    road_type: "Arterial / Ring Roads",
    speed_limit: 50,
    penalty: "₹10,000 (Supreme Court Mandated)",
    effective_date: "2023-11-01",
    source: "Delhi Traffic Police Standing Order 24/2023"
  },
  {
    id: "TR-BH-001",
    state: "Bihar",
    offence: "Over-dimension / Overloading Cargo",
    vehicle_type: "Commercial Goods Carrier",
    road_type: "State & National Highways",
    speed_limit: 60,
    penalty: "₹20,000 + ₹2,000 per extra tonne",
    effective_date: "2024-02-15",
    source: "Bihar Motor Transport Regulation 194(1)"
  },
  {
    id: "TR-KA-001",
    state: "Karnataka",
    offence: "Driver Fatigue / Non-stop driving > 8 hours",
    vehicle_type: "Long-haul Commercial Truck",
    road_type: "National Highway (NH 48 / NH 44)",
    speed_limit: null,
    penalty: "Mandatory 2-hr rest at checkpoint + ₹1,500 fine",
    effective_date: "2024-03-01",
    source: "Karnataka State Road Safety Authority Advisory"
  }
];

export const TrafficRuleModel = {
  findAll: (filter = {}) => {
    let result = trafficRulesData;
    if (filter.state) {
      result = result.filter(r => r.state.toLowerCase().includes(filter.state.toLowerCase()));
    }
    if (filter.vehicle_type) {
      result = result.filter(r => r.vehicle_type.toLowerCase().includes(filter.vehicle_type.toLowerCase()));
    }
    return result;
  },
  getStates: () => {
    return [...new Set(trafficRulesData.map(r => r.state))];
  },
  findById: (id) => {
    return trafficRulesData.find(r => r.id === id) || null;
  }
};

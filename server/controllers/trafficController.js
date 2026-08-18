import { TrafficRuleModel } from "../models/trafficRuleModel.js";

export const TrafficController = {
  getRules: (req, res) => {
    try {
      const { state, vehicle_type } = req.query;
      const rules = TrafficRuleModel.findAll({ state, vehicle_type });
      const allStates = TrafficRuleModel.getStates();
      res.json({ count: rules.length, rules, allStates });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic rules", details: error.message });
    }
  },
  getRuleById: (req, res) => {
    try {
      const rule = TrafficRuleModel.findById(req.params.id);
      if (!rule) return res.status(404).json({ error: "Traffic rule not found" });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
};

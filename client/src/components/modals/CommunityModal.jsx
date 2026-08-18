import React, { useState, useEffect } from "react";
import { 
  X, 
  Users, 
  AlertTriangle, 
  ThumbsUp, 
  PlusCircle, 
  Construction, 
  CloudFog, 
  ShieldAlert, 
  Send,
  MapPin
} from "lucide-react";

export default function CommunityModal({ isOpen, onClose }) {
  const [hazards, setHazards] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "Road Block",
    title: "",
    location: "NH 44, Near Toll Plaza 2",
    distanceKm: "1.5",
    severity: "medium"
  });

  const fetchHazards = () => {
    fetch("/api/hazards")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHazards(data);
      })
      .catch(err => console.warn("Hazards fetch fallback:", err));
  };

  useEffect(() => {
    fetchHazards();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpvote = async (id) => {
    try {
      const res = await fetch(`/api/hazards/${id}/upvote`, { method: "POST" });
      const updated = await res.json();
      setHazards(prev => prev.map(h => h.id === id ? updated : h));
    } catch (e) {
      console.warn("Upvote error:", e);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const res = await fetch("/api/hazards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const created = await res.json();
      setHazards(prev => [created, ...prev]);
      setShowReportForm(false);
      setFormData({
        type: "Road Block",
        title: "",
        location: "NH 44, Near Toll Plaza 2",
        distanceKm: "1.5",
        severity: "medium"
      });
    } catch (e) {
      console.warn("Create hazard error:", e);
    }
  };

  const getHazardIcon = (type) => {
    switch (type) {
      case "Accident": return AlertTriangle;
      case "Road Block": return Construction;
      case "Fog / Visibility": return CloudFog;
      default: return ShieldAlert;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white/95 backdrop-blur-2xl border border-indigo-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 to-purple-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Driver Community & Live Hazard Radar</h2>
              <p className="text-xs text-indigo-100 font-medium">12 verified commercial drivers active on NH 44 corridor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            Real-Time Community Alerts ({hazards.length})
          </div>
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{showReportForm ? "Cancel" : "Report Hazard"}</span>
          </button>
        </div>

        {/* Hazard Submission Form */}
        {showReportForm && (
          <form onSubmit={handleCreateReport} className="p-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3 shrink-0 animate-in fade-in">
            <div className="text-xs font-extrabold text-indigo-900">Broadcast New Road Hazard to Nearby Drivers</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hazard Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800"
                >
                  <option value="Road Block">🚧 Road Block</option>
                  <option value="Accident">🚨 Accident</option>
                  <option value="Fog / Visibility">🌫 Dense Fog / Low Visibility</option>
                  <option value="Pothole">🕳 Deep Pothole</option>
                  <option value="Police Checkpoint">🚔 Police / Checking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800"
                >
                  <option value="low">Low (Caution)</option>
                  <option value="medium">Medium (Slow down)</option>
                  <option value="high">High (Danger / Diversion)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Location Landmark</label>
              <input
                type="text"
                placeholder="e.g. Overturned trailer blocking middle lane near km 238"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Broadcast to Nearby Drivers
            </button>
          </form>
        )}

        {/* Hazard List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {hazards.map((h) => {
            const Icon = getHazardIcon(h.type);
            const isHigh = h.severity === "high";

            return (
              <div
                key={h.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 shadow-xs flex items-start justify-between gap-3 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isHigh ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{h.type}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {h.distanceKm} km ahead
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">{h.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {h.location}
                      </span>
                      <span>•</span>
                      <span>Reported by {h.reporter} ({h.reportedTime})</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUpvote(h.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{h.upvotes}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { X, Shield, Search, BookOpen, AlertCircle, FileText, Calendar } from "lucide-react";

export default function TrafficRulesModal({ isOpen, onClose }) {
  const [rules, setRules] = useState([]);
  const [selectedState, setSelectedState] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [states, setStates] = useState(["All", "Uttar Pradesh", "Maharashtra", "Delhi NCR", "Bihar", "Karnataka"]);

  useEffect(() => {
    fetch("/api/traffic/rules")
      .then(res => res.json())
      .then(data => {
        if (data.rules) {
          setRules(data.rules);
          if (data.allStates) {
            setStates(["All", ...data.allStates]);
          }
        }
      })
      .catch(err => console.warn("Traffic rules fetch fallback:", err));
  }, []);

  if (!isOpen) return null;

  const filteredRules = rules.filter(r => {
    const matchState = selectedState === "All" || r.state === selectedState;
    const matchQuery = !searchQuery || 
      r.offence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.road_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.penalty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchState && matchQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Road Safety & Jurisdictional Traffic Intelligence</h2>
              <p className="text-xs text-blue-100 font-medium">Real-time state road rules, speed limits & Motor Vehicle Act penalties</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by offence, highway, or penalty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {states.map(st => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedState === st
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Rules Table / Cards */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredRules.length > 0 ? (
            filteredRules.map(rule => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
                        {rule.state}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {rule.road_type}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{rule.offence}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-rose-600">{rule.penalty}</div>
                    {rule.speed_limit && (
                      <div className="text-[11px] font-semibold text-slate-500">Speed Limit: {rule.speed_limit} km/h</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 gap-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Legal Source: <strong className="text-slate-700">{rule.source}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Effective: {rule.effective_date}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No specific traffic regulations match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

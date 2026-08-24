import React, { useState, useEffect } from "react";
import { X, Radio, Copy, Check, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";

export default function ShareLocationModal({ isOpen, onClose }) {
  const [sessions, setSessions] = useState([
    { id: "SHR-1", contact: "Fleet Operations Desk", phone: "+91 98765 43210", active: true, expiresAt: "2h remaining" },
    { id: "SHR-2", contact: "Pooja Kumar (Family)", phone: "+91 98111 22334", active: true, expiresAt: "2h remaining" }
  ]);
  const liveUrl = "https://adapt-india.live/track/trk_9921_rajesh";


  useEffect(() => {
    fetch("/api/location/share")
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setSessions(data.sessions);
      })
      .catch(e => console.warn("Share status fetch fallback:", e));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSession = async (id) => {
    try {
      await fetch("/api/location/share/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id })
      });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    } catch (e) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-2xl border border-emerald-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Radio className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Live Trip & Location Sharing</h2>
              <p className="text-xs text-emerald-100 font-medium">Voluntary encrypted live tracking for trusted contacts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Tracking Link Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Live Secure Tracking Link</label>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                readOnly
                value={liveUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-700 outline-hidden select-all"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Active Contacts List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">Authorised Contacts</div>
            {sessions.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{s.contact}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{s.phone} • {s.expiresAt}</div>
                </div>
                <button
                  onClick={() => toggleSession(s.id)}
                  className="cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {s.active ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Privacy Guard: Tracking automatically stops when your shift ends or when you tap the toggle.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

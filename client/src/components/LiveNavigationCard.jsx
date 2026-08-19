import React, { useState, useEffect, useRef } from "react";
import { 
  Navigation, 
  CornerUpRight, 
  CornerUpLeft,
  ArrowUp,
  RotateCcw,
  GitMerge,
  Volume2, 
  VolumeX, 
  Crosshair, 
  Plus, 
  Minus, 
  StopCircle,
  MapPin,
  Search,
  X,
  Compass,
  Radio,
  Layers,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { loadGoogleMaps, SURAKHA_MAP_STYLES } from "../utils/googleMapsLoader";

// Preset popular destinations for quick lookup & autocomplete testing
const POPULAR_DESTINATIONS = [
  { name: "Patna Junction", address: "Patna Railway Station, Bihar, India", lat: 25.6022, lng: 85.1376, category: "Transit" },
  { name: "IIT Guwahati", address: "Amingaon, Guwahati, Assam, India", lat: 26.1878, lng: 91.6916, category: "University" },
  { name: "AIIMS Patna", address: "Phulwari Sharif, Patna, Bihar, India", lat: 25.5606, lng: 85.0456, category: "Hospital" },
  { name: "GEC Jamui", address: "Government Engineering College, Jamui, Bihar", lat: 24.9194, lng: 86.2238, category: "College" },
  { name: "Delhi Indira Gandhi Airport", address: "New Delhi, Delhi 110037, India", lat: 28.5562, lng: 77.1000, category: "Airport" },
  { name: "Highway Oasis Rest Area", address: "NH 44, Mile 238 Highway Rest Hub", lat: 28.5600, lng: 77.4100, category: "Rest Stop" },
  { name: "Indian Oil Swagat Fuel Complex", address: "NH 44 Mile 231 Diesel Depot", lat: 28.5390, lng: 77.3940, category: "Fuel" }
];

export default function LiveNavigationCard({ onEndTrip }) {
  const { 
    coords, 
    gpsStatus, 
    gpsStatusMessage, 
    formattedAddress, 
    currentRoad, 
    destination, 
    routeInfo, 
    selectDestination, 
    calculateRoute, 
    isAutoFollow, 
    setIsAutoFollow, 
    recenterTrigger, 
    triggerRecenter 
  } = useLocation();

  const [voiceMuted, setVoiceMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [mapType, setMapType] = useState("roadmap"); // 'roadmap' | 'satellite'
  const [isGoogleMapLoaded, setIsGoogleMapLoaded] = useState(false);
  const [googleMapError, setGoogleMapError] = useState(null);

  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const destMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const searchInputRef = useRef(null);

  const { latitude, longitude, accuracy, heading, speedKmh } = coords;

  // 1. Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const initialPos = { lat: latitude || 28.5355, lng: longitude || 77.3910 };

        // Create Google Map
        const map = new googleMaps.Map(mapContainerRef.current, {
          center: initialPos,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: SURAKHA_MAP_STYLES,
          mapTypeId: mapType
        });

        googleMapInstanceRef.current = map;
        setIsGoogleMapLoaded(true);

        // Detect user manual interaction to pause auto-follow
        map.addListener("dragstart", () => setIsAutoFollow(false));
        map.addListener("zoom_changed", () => {
          // If zoom was triggered manually (not programmatically), pause auto-follow
        });

        // Driver Marker (Surakha Blue Pulse Icon)
        const driverIcon = {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3.5
        };

        const marker = new googleMaps.Marker({
          position: initialPos,
          map,
          icon: driverIcon,
          title: "Driver Current Location",
          zIndex: 999
        });
        driverMarkerRef.current = marker;

        // Accuracy Circle
        const circle = new googleMaps.Circle({
          center: initialPos,
          radius: accuracy || 25,
          map,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          strokeColor: "#60a5fa",
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          zIndex: 1
        });
        accuracyCircleRef.current = circle;

        // Destination Marker
        if (destination) {
          const destMarker = new googleMaps.Marker({
            position: { lat: destination.lat, lng: destination.lng },
            map,
            title: destination.name,
            icon: {
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1.5,
              anchor: new googleMaps.Point(12, 22)
            }
          });
          destMarkerRef.current = destMarker;
        }

        // Directions Renderer
        const directionsRenderer = new googleMaps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#2563eb",
            strokeOpacity: 0.9,
            strokeWeight: 6
          }
        });
        directionsRendererRef.current = directionsRenderer;

        // Setup Places Autocomplete on the input
        if (searchInputRef.current && googleMaps.places) {
          const autocomplete = new googleMaps.places.Autocomplete(searchInputRef.current, {
            fields: ["formatted_address", "geometry", "name"]
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              const newDest = {
                name: place.name || "Selected Destination",
                address: place.formatted_address || "",
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              selectDestination(newDest);
              setIsSearchOpen(false);
              setSearchQuery("");
            }
          });
        }

        // Initial route calculation
        if (destination) {
          calculateRoute(destination, coords);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.info("Google Maps status:", err.message);
        setGoogleMapError(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Smoothly Update Driver Marker & Accuracy Circle on GPS Changes
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google || !window.google.maps) return;

    const newPos = new window.google.maps.LatLng(latitude, longitude);

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(newPos);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setCenter(newPos);
      if (accuracy) accuracyCircleRef.current.setRadius(accuracy);
    }

    // Auto follow if enabled
    if (isAutoFollow) {
      googleMapInstanceRef.current.panTo(newPos);
    }
  }, [latitude, longitude, accuracy, isAutoFollow]);

  // 3. Recenter map trigger from context
  useEffect(() => {
    if (recenterTrigger > 0 && googleMapInstanceRef.current && window.google) {
      const pos = new window.google.maps.LatLng(latitude, longitude);
      googleMapInstanceRef.current.panTo(pos);
      googleMapInstanceRef.current.setZoom(16);
    }
  }, [recenterTrigger, latitude, longitude]);

  // 4. Update Destination Marker & Render Route Polyline
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google || !window.google.maps) return;

    if (destination) {
      const destPos = new window.google.maps.LatLng(destination.lat, destination.lng);
      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition(destPos);
        destMarkerRef.current.setTitle(destination.name);
      } else {
        destMarkerRef.current = new window.google.maps.Marker({
          position: destPos,
          map: googleMapInstanceRef.current,
          title: destination.name
        });
      }
    }

    if (directionsRendererRef.current && routeInfo?.directionsResult) {
      directionsRendererRef.current.setDirections(routeInfo.directionsResult);
    }
  }, [destination, routeInfo]);

  // Zoom helpers
  const handleZoom = (delta) => {
    if (googleMapInstanceRef.current) {
      const curr = googleMapInstanceRef.current.getZoom() || 15;
      googleMapInstanceRef.current.setZoom(curr + delta);
    }
  };

  // Toggle Map Satellite / Roadmap
  const toggleMapType = () => {
    const next = mapType === "roadmap" ? "hybrid" : "roadmap";
    setMapType(next);
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setMapTypeId(next);
    }
  };

  // Turn Maneuver Icon Selection
  const getManeuverIcon = (maneuver) => {
    const m = (maneuver || "").toLowerCase();
    if (m.includes("left")) return CornerUpLeft;
    if (m.includes("uturn")) return RotateCcw;
    if (m.includes("merge")) return GitMerge;
    if (m.includes("straight") || m.includes("ahead")) return ArrowUp;
    return CornerUpRight;
  };

  const ManeuverIcon = getManeuverIcon(routeInfo?.maneuver);

  // Filter destination suggestions
  const filteredSuggestions = POPULAR_DESTINATIONS.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3.5 h-full relative">
      {/* 1. Navigation Header & Real GPS Status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <MapPin className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Live Navigation</h2>
          </div>
        </div>

        {/* Dynamic GPS Status Indicator */}
        <div className="flex items-center gap-2">
          {gpsStatus === "connected" && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>GPS Connected {accuracy ? `(�${accuracy}m)` : ""}</span>
            </div>
          )}

          {gpsStatus === "searching" && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Searching for GPS...</span>
            </div>
          )}

          {gpsStatus === "weak" && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Weak GPS (�{accuracy}m)</span>
            </div>
          )}

          {(gpsStatus === "denied" || gpsStatus === "error" || gpsStatus === "unsupported") && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>{gpsStatusMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Destination Search Box */}
      <div className="relative z-30">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="?? Search destination (e.g., IIT Guwahati, Patna Junction, AIIMS)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-10 pr-10 py-2 rounded-2xl bg-white/90 border border-slate-200/90 shadow-sm text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 backdrop-blur-md transition-all"
          />
          {searchQuery ? (
            <button 
              onClick={() => {
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-3 p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="absolute right-3 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              Places
            </button>
          )}
        </div>

        {/* Autocomplete / Places Dropdown */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl z-40 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
              <span>Quick Destinations & Hubs</span>
              <span className="text-blue-600">Google Places Ready</span>
            </div>

            <div className="space-y-1 mt-1">
              {filteredSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    selectDestination(item);
                    setSearchQuery(item.name);
                    setIsSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/80 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100/70 flex items-center justify-center text-blue-600 shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{item.address}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Map Viewport */}
      <div className="relative w-full flex-1 min-h-[380px] lg:min-h-[460px] rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-[#f1f5f9]">
        {/* Real Google Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Fallback Vector Interactive Map (Renders smoothly if Google Maps JS is awaiting key or loading) */}
        {!isGoogleMapLoaded && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] flex flex-col items-center justify-center">
            {/* Interactive Simulated Dynamic Route Grid */}
            <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                </pattern>
                <linearGradient id="routeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="#f8fafc" />
              <rect width="100%" height="100%" fill="url(#gridPattern)" />

              {/* Highway Corridor */}
              <path d="M 120 450 L 320 220 L 500 120" stroke="#f1f5f9" strokeWidth="16" fill="none" />
              <path d="M 280 480 L 310 320 L 325 180 L 340 60" stroke="#e2e8f0" strokeWidth="22" fill="none" strokeLinecap="round" />
              <path d="M 280 480 L 310 320 L 325 180 L 340 60" stroke="#fde047" strokeWidth="12" fill="none" strokeLinecap="round" />

              {/* Dynamic Route Polyline */}
              <path 
                d="M 305 350 L 310 320 L 325 180 L 340 60" 
                stroke="url(#routeGradient)" 
                strokeWidth="7" 
                fill="none" 
                strokeLinecap="round"
                className="drop-shadow-md"
              />

              {/* Destination Pin */}
              <g transform="translate(340, 60)">
                <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2" className="drop-shadow-md" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />
              </g>

              {/* Dynamic Driver GPS Position Marker with Heading & Accuracy */}
              <g transform="translate(305, 350)">
                <circle cx="0" cy="0" r={accuracy ? Math.min(45, Math.max(20, accuracy)) : 24} fill="#3b82f6" fillOpacity="0.18" className="animate-ping" />
                <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" className="drop-shadow-lg" />
                {/* Heading Direction Cone */}
                <path 
                  d="M 0 -8 L 6 6 L 0 3 L -6 6 Z" 
                  fill="#2563eb" 
                  transform={`rotate(${heading || 0})`}
                />
              </g>
            </svg>

            {/* Subtle Info Badge if API Key isn't set yet */}
            {googleMapError && (
              <div className="absolute top-20 inset-x-6 z-10 p-2.5 rounded-xl bg-blue-900/80 backdrop-blur-md text-white border border-blue-400/40 text-center shadow-lg animate-in fade-in">
                <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                  Real GPS Active � Lat: {latitude.toFixed(4)}�, Lng: {longitude.toFixed(4)}�
                </div>
                <div className="text-[10px] text-blue-200 mt-0.5">
                  Live tracking active. Add <code className="bg-blue-950 px-1 py-0.5 rounded text-white">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="bg-blue-950 px-1 py-0.5 rounded text-white">.env</code> for Google satellite & street view.
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Top-Left Dynamic Turn-by-Turn Guidance Banner */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-emerald-800/95 text-white shadow-xl backdrop-blur-md border border-emerald-600/40 min-w-[210px] max-w-[320px] animate-in fade-in slide-in-from-top-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
            <ManeuverIcon className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-extrabold tracking-tight leading-tight">
              {routeInfo?.nextDistance || "1.2 km"}
            </div>
            <div className="text-xs font-semibold text-emerald-100 leading-snug truncate">
              {routeInfo?.currentInstruction || `Continue toward ${destination?.name || "Destination"}`}
            </div>
          </div>
        </div>

        {/* 5. Floating Map Controls (Right Side) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Mute/Unmute */}
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={voiceMuted ? "Unmute Voice Guidance" : "Mute Voice Guidance"}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Map Layer Switcher (Roadmap / Satellite) */}
          <button
            onClick={toggleMapType}
            className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={`Switch to ${mapType === "roadmap" ? "Satellite" : "Roadmap"} View`}
          >
            <Layers className="w-4 h-4 text-slate-700" />
          </button>

          {/* Recenter Driver GPS */}
          <button
            onClick={triggerRecenter}
            className={`p-2.5 rounded-xl shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              isAutoFollow ? "bg-blue-600 text-white" : "bg-white/90 hover:bg-white text-slate-700"
            }`}
            title="Recenter & Auto-Follow Driver"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Zoom In & Out */}
          <div className="flex flex-col rounded-xl bg-white/90 shadow-md border border-white backdrop-blur-md overflow-hidden">
            <button
              onClick={() => handleZoom(1)}
              className="p-2 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-100 cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-1)}
              className="p-2 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Developer GPS Debug HUD */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-xl text-[10px] font-bold shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
              showDebug ? "bg-slate-900 text-emerald-400" : "bg-white/90 hover:bg-white text-slate-600"
            }`}
            title="Toggle Live GPS Debug Telemetry HUD"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>GPS</span>
          </button>
        </div>

        {/* 6. Collapsible Developer GPS Debug HUD */}
        {showDebug && (
          <div className="absolute top-20 right-4 z-30 w-64 p-3 rounded-2xl bg-slate-950/90 text-emerald-400 border border-emerald-500/30 shadow-2xl backdrop-blur-xl font-mono text-[10px] space-y-1 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1 text-slate-300 font-bold uppercase">
              <span>GPS TELEMETRY DEBUG</span>
              <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white">?</button>
            </div>
            <div className="flex justify-between"><span>Latitude:</span> <strong className="text-white">{latitude?.toFixed(5)}�</strong></div>
            <div className="flex justify-between"><span>Longitude:</span> <strong className="text-white">{longitude?.toFixed(5)}�</strong></div>
            <div className="flex justify-between"><span>Accuracy:</span> <strong className="text-white">�{accuracy || 12} m</strong></div>
            <div className="flex justify-between"><span>Speed:</span> <strong className="text-white">{speedKmh || 52} km/h</strong></div>
            <div className="flex justify-between"><span>Heading:</span> <strong className="text-white">{heading !== null ? `${heading}�` : "N/A"}</strong></div>
            <div className="flex justify-between"><span>GPS State:</span> <strong className="text-emerald-400 uppercase">{gpsStatus}</strong></div>
            <div className="flex justify-between"><span>Auto-Follow:</span> <strong className={isAutoFollow ? "text-emerald-400" : "text-amber-400"}>{isAutoFollow ? "ON" : "PAUSED"}</strong></div>
            <div className="pt-1 border-t border-slate-800 text-[9px] text-slate-400 truncate">
              Road: {currentRoad}
            </div>
          </div>
        )}

        {/* 7. Bottom Trip Telemetry Strip (Dynamic Route, Distance & ETA) */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-xl text-slate-800">
          <div className="flex items-center gap-4 sm:gap-8">
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                {routeInfo?.durationText || "56 min"}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                ETA {routeInfo?.eta || "11:45 AM"}
              </div>
            </div>

            <div className="border-l border-slate-200 pl-3 sm:pl-6">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                {routeInfo?.distanceText || "38 km"}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                Distance
              </div>
            </div>

            <div className="border-l border-slate-200 pl-3 sm:pl-6 hidden sm:block">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate max-w-[140px]">
                {currentRoad || "NH 44"}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                {destination ? `To: ${destination.name}` : "Current Road"}
              </div>
            </div>
          </div>

          <button
            onClick={onEndTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <StopCircle className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
            <span>End Trip</span>
          </button>
        </div>
      </div>
    </div>
  );
}

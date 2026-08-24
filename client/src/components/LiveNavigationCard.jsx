import React, { useState, useEffect, useRef } from "react";
import { 
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
  Layers,
  AlertCircle,
  Activity,
  Box
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
import { useTrafficSafety } from "../context/TrafficSafetyContext";
import { 
  loadGoogleLibrary, 
  SURAKHA_MAP_STYLES 
} from "../utils/googleMapsLoader";
import { usePerception } from "../context/PerceptionContext";
import Lidar3DViewer from "./Lidar3DViewer";


const POPULAR_DESTINATIONS = [
  { name: "Patna Junction", address: "Patna Railway Station, Bihar 800001", lat: 25.6022, lng: 85.1376, category: "Transit" },
  { name: "IIT Guwahati", address: "Amingaon, North Guwahati, Assam 781039", lat: 26.1878, lng: 91.6916, category: "University" },
  { name: "AIIMS Patna", address: "Phulwari Sharif, Patna, Bihar 801507", lat: 25.5606, lng: 85.0456, category: "Hospital" },
  { name: "GEC Jamui", address: "Government Engineering College, Jamui, Bihar 811313", lat: 24.9194, lng: 86.2238, category: "College" },
  { name: "Delhi Indira Gandhi Airport", address: "New Delhi, Delhi 110037", lat: 28.5562, lng: 77.1000, category: "Airport" },
  { name: "Highway Oasis Rest Complex", address: "NH 44, Mile 238 Highway Rest Hub", lat: 28.5600, lng: 77.4100, category: "Rest Stop" },
  { name: "Indian Oil Swagat Fuel Complex", address: "NH 44 Mile 231 Diesel Depot", lat: 28.5390, lng: 77.3940, category: "Fuel" }
];

export default function LiveNavigationCard({ onEndTrip }) {
  const { 
    coords, 
    gpsStatus, 
    gpsStatusMessage, 
    currentRoad, 
    isAutoFollow, 
    setIsAutoFollow, 
    recenterTrigger, 
    triggerRecenter 
  } = useLocation();

  const { 
    destination, 
    selectDestination, 
    routeInfo, 
    viewMode, 
    setViewMode,
    setIs3DSupported
  } = useNavigation();

  const {
    centerViewMode,
    setCenterViewMode,
    showMapPerceptionOverlay,
    setShowMapPerceptionOverlay,
    objects,
    pathPlan
  } = usePerception();

  const { trafficData } = useTrafficSafety();
  const hazardMarkersRef = useRef([]);


  const [voiceMuted, setVoiceMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [placesSuggestions, setPlacesSuggestions] = useState(POPULAR_DESTINATIONS);
  const [showDebug, setShowDebug] = useState(false);
  const [mapType, setMapType] = useState("roadmap"); // 'roadmap' | 'hybrid'
  const [is3DNativeActive, setIs3DNativeActive] = useState(false);

  const map2DContainerRef = useRef(null);
  const map3DContainerRef = useRef(null);
  
  // Google Map Refs
  const map2DInstanceRef = useRef(null);
  const driver2DMarkerRef = useRef(null);
  const accuracy2DCircleRef = useRef(null);
  const dest2DMarkerRef = useRef(null);
  const directions2DRendererRef = useRef(null);
  const routePolyline2DRef = useRef(null);

  // Google 3D Element Refs
  const map3DInstanceRef = useRef(null);
  const driver3DMarkerRef = useRef(null);
  const dest3DMarkerRef = useRef(null);

  // Autocomplete service ref
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);

  const { latitude, longitude, accuracy, heading, speedKmh } = coords;

  // ----------------------------------------------------
  // 1. Initialize Google Places Autocomplete Service
  // ----------------------------------------------------
  useEffect(() => {
    let mounted = true;
    loadGoogleLibrary("places")
      .then((placesLib) => {
        if (!mounted) return;
        const { AutocompleteService, PlacesService } = placesLib;
        autocompleteServiceRef.current = new AutocompleteService();
        const dummyNode = document.createElement("div");
        placesServiceRef.current = new PlacesService(dummyNode);
      })
      .catch((err) => {
        console.warn("Places library notice:", err.message);
      });

    return () => { mounted = false; };
  }, []);

  // Handle predictive places search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setPlacesSuggestions(POPULAR_DESTINATIONS);
      return;
    }

    if (autocompleteServiceRef.current) {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchQuery,
          componentRestrictions: { country: "in" }
        },
        (predictions, status) => {
          if (status === "OK" && predictions && predictions.length > 0) {
            const mapped = predictions.map(p => ({
              name: p.structured_formatting?.main_text || p.description,
              address: p.structured_formatting?.secondary_text || p.description,
              placeId: p.place_id,
              category: "Google Place"
            }));
            setPlacesSuggestions(mapped);
          } else {
            const filtered = POPULAR_DESTINATIONS.filter(d =>
              d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.address.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setPlacesSuggestions(filtered);
          }
        }
      );
    }
  }, [searchQuery]);

  // Handle destination select
  const handleSelectPlace = (place) => {
    if (place.lat && place.lng) {
      selectDestination(place);
      setSearchQuery(place.name);
      setIsSearchOpen(false);
      return;
    }

    if (place.placeId && placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: place.placeId, fields: ["name", "formatted_address", "geometry"] },
        (details, status) => {
          if (status === "OK" && details?.geometry?.location) {
            const resolved = {
              name: details.name || place.name,
              address: details.formatted_address || place.address,
              lat: details.geometry.location.lat(),
              lng: details.geometry.location.lng(),
              category: "Place"
            };
            selectDestination(resolved);
            setSearchQuery(resolved.name);
            setIsSearchOpen(false);
          }
        }
      );
    }
  };

  // ----------------------------------------------------
  // 2. Initialize Main Google Map (with 3D Vector & 2D support)
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    loadGoogleLibrary("maps")
      .then((mapsLib) => {
        if (!isMounted || !map2DContainerRef.current) return;

        const initialPos = { lat: latitude || 28.5355, lng: longitude || 77.3910 };

        if (!map2DInstanceRef.current) {
          const map = new mapsLib.Map(map2DContainerRef.current, {
            center: initialPos,
            zoom: viewMode === "3D" ? 17.5 : 15.5,
            tilt: viewMode === "3D" ? 60 : 0,
            heading: viewMode === "3D" ? (heading || 45) : 0,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: SURAKHA_MAP_STYLES,
            mapTypeId: mapType
          });

          map2DInstanceRef.current = map;

          // Detect manual interaction to pause auto-follow
          map.addListener("dragstart", () => setIsAutoFollow(false));

          // Accuracy Circle
          const circle = new window.google.maps.Circle({
            center: initialPos,
            radius: accuracy || 20,
            map,
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            strokeColor: "#60a5fa",
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            zIndex: 10
          });
          accuracy2DCircleRef.current = circle;

          // Driver Marker (Surakha Blue Pulse Icon with Vehicle Pointer)
          const driverMarker = new window.google.maps.Marker({
            position: initialPos,
            map,
            title: "Driver Location",
            zIndex: 999,
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              rotation: heading || 0
            }
          });
          driver2DMarkerRef.current = driverMarker;

          // Directions Renderer
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 6
            }
          });
          directions2DRendererRef.current = directionsRenderer;
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Map setup notice:", err.message);
      });

    return () => { isMounted = false; };
  }, []);

  // ----------------------------------------------------
  // 3. Dynamic 2D ↔ 3D Camera & Vector Mode Transitions
  // ----------------------------------------------------
  useEffect(() => {
    if (!map2DInstanceRef.current || !window.google?.maps) return;
    const map = map2DInstanceRef.current;

    if (viewMode === "3D") {
      // Switch into 3D Cockpit Navigation View
      map.setTilt(60);
      if (heading !== null && !isNaN(heading)) {
        map.setHeading(heading);
      } else {
        map.setHeading(45);
      }
      map.setZoom(17.5);
      if (latitude && longitude) {
        map.panTo({ lat: latitude, lng: longitude });
      }

      // Try native maps3d element if available
      loadGoogleLibrary("maps3d")
        .then((maps3dLib) => {
          if (!map3DContainerRef.current) return;
          const { Map3DElement, Marker3DElement } = maps3dLib;

          if (Map3DElement && !map3DInstanceRef.current) {
            map3DContainerRef.current.innerHTML = "";
            const map3d = new Map3DElement({
              center: { lat: latitude || 28.5355, lng: longitude || 77.3910, altitude: 0 },
              tilt: 60,
              heading: heading || 45,
              range: 700
            });
            map3d.style.width = "100%";
            map3d.style.height = "100%";
            map3d.style.display = "block";

            map3DContainerRef.current.appendChild(map3d);
            map3DInstanceRef.current = map3d;

            if (Marker3DElement) {
              const driver3d = new Marker3DElement({
                position: { lat: latitude || 28.5355, lng: longitude || 77.3910, altitude: 5 },
                label: "Driver"
              });
              map3d.appendChild(driver3d);
              driver3DMarkerRef.current = driver3d;
            }

            setIs3DNativeActive(true);
          }
        })
        .catch(() => {
          setIs3DNativeActive(false);
        });

    } else {
      // Switch back to 2D Planar View
      map.setTilt(0);
      map.setHeading(0);
      map.setZoom(15.5);
      if (latitude && longitude) {
        map.panTo({ lat: latitude, lng: longitude });
      }
      setIs3DNativeActive(false);
    }
  }, [viewMode, heading, latitude, longitude]);

  // Update Driver Marker Position & Accuracy Circle continuously
  useEffect(() => {
    if (!map2DInstanceRef.current || !window.google?.maps) return;

    const newPos = new window.google.maps.LatLng(latitude, longitude);

    if (driver2DMarkerRef.current) {
      driver2DMarkerRef.current.setPosition(newPos);
      if (heading !== null && !isNaN(heading)) {
        driver2DMarkerRef.current.setIcon({
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          rotation: heading
        });
      }
    }

    if (accuracy2DCircleRef.current) {
      accuracy2DCircleRef.current.setCenter(newPos);
      if (accuracy) accuracy2DCircleRef.current.setRadius(accuracy);
    }

    if (isAutoFollow) {
      map2DInstanceRef.current.panTo(newPos);
      if (viewMode === "3D" && heading !== null) {
        map2DInstanceRef.current.setHeading(heading);
      }
    }

    if (map3DInstanceRef.current && is3DNativeActive) {
      map3DInstanceRef.current.center = { lat: latitude, lng: longitude, altitude: 0 };
      if (driver3DMarkerRef.current) {
        driver3DMarkerRef.current.position = { lat: latitude, lng: longitude, altitude: 5 };
      }
    }
  }, [latitude, longitude, accuracy, heading, isAutoFollow, viewMode, is3DNativeActive]);

  // Update Destination Marker & Directions Route
  useEffect(() => {
    if (!map2DInstanceRef.current || !window.google?.maps) return;

    if (destination?.lat && destination?.lng) {
      const destPos = new window.google.maps.LatLng(destination.lat, destination.lng);
      if (dest2DMarkerRef.current) {
        dest2DMarkerRef.current.setPosition(destPos);
        dest2DMarkerRef.current.setTitle(destination.name);
      } else {
        dest2DMarkerRef.current = new window.google.maps.Marker({
          position: destPos,
          map: map2DInstanceRef.current,
          title: destination.name,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 1.4,
            anchor: new window.google.maps.Point(12, 22)
          }
        });
      }
    }

    if (directions2DRendererRef.current && routeInfo?.directionsResult) {
      directions2DRendererRef.current.setDirections(routeInfo.directionsResult);
    } else if (routeInfo?.polylinePath && routeInfo.polylinePath.length > 0) {
      if (routePolyline2DRef.current) {
        routePolyline2DRef.current.setPath(routeInfo.polylinePath);
      } else {
        routePolyline2DRef.current = new window.google.maps.Polyline({
          path: routeInfo.polylinePath,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 6,
          map: map2DInstanceRef.current
        });
      }
    }
  }, [destination, routeInfo]);

  // Render Nearby Road Hazards on Google Map
  useEffect(() => {
    if (!map2DInstanceRef.current || !window.google?.maps) return;

    // Clear previous hazard markers
    hazardMarkersRef.current.forEach(m => m.setMap(null));
    hazardMarkersRef.current = [];

    const hazards = trafficData?.hazards || [];
    hazards.forEach(h => {
      if (h.coordinates?.lat && h.coordinates?.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: h.coordinates.lat, lng: h.coordinates.lng },
          map: map2DInstanceRef.current,
          title: `${h.type}: ${h.title}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: h.type === "ACCIDENT" ? "#ef4444" : h.type === "SPEED_CAMERA" ? "#f59e0b" : "#6366f1",
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding:6px;font-family:sans-serif;color:#1e293b;"><strong style="font-size:12px;">${h.title}</strong><div style="font-size:11px;color:#64748b;margin-top:2px;">${h.distanceText || ""} • ${h.confidence || ""}</div></div>`
        });

        marker.addListener("click", () => {
          infoWindow.open(map2DInstanceRef.current, marker);
        });

        hazardMarkersRef.current.push(marker);
      }
    });
  }, [trafficData?.hazards]);

  // Recenter Map Trigger
  useEffect(() => {
    if (recenterTrigger > 0 && map2DInstanceRef.current && window.google?.maps) {
      const pos = new window.google.maps.LatLng(latitude, longitude);
      map2DInstanceRef.current.panTo(pos);
      if (viewMode === "3D") {
        map2DInstanceRef.current.setTilt(60);
        map2DInstanceRef.current.setZoom(17.5);
        if (heading !== null) map2DInstanceRef.current.setHeading(heading);
      } else {
        map2DInstanceRef.current.setTilt(0);
        map2DInstanceRef.current.setZoom(16);
        map2DInstanceRef.current.setHeading(0);
      }
    }
  }, [recenterTrigger, latitude, longitude, viewMode, heading]);

  // Zoom controls
  const handleZoom = (delta) => {
    if (map2DInstanceRef.current) {
      const curr = map2DInstanceRef.current.getZoom() || 15.5;
      map2DInstanceRef.current.setZoom(curr + delta);
    }
  };

  // Switch Map Layer
  const toggleMapType = () => {
    const next = mapType === "roadmap" ? "hybrid" : "roadmap";
    setMapType(next);
    if (map2DInstanceRef.current) {
      map2DInstanceRef.current.setMapTypeId(next);
    }
  };

  // Maneuver icon helper
  const getManeuverIcon = (maneuver) => {
    const m = (maneuver || "").toLowerCase();
    if (m.includes("left")) return CornerUpLeft;
    if (m.includes("uturn")) return RotateCcw;
    if (m.includes("merge")) return GitMerge;
    if (m.includes("straight") || m.includes("ahead")) return ArrowUp;
    return CornerUpRight;
  };

  const ManeuverIcon = getManeuverIcon(routeInfo?.maneuver);

  // Clean road display name
  const cleanRoadDisplay = currentRoad && !currentRoad.includes("+") 
    ? currentRoad 
    : "NH 44 Highway Corridor";

  return (
    <div className="flex flex-col gap-3.5 h-full relative">
      {/* 1. Header with View Mode Switcher & AI Perception Overlay Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <MapPin className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              {centerViewMode === "LIDAR_3D" ? "LiDAR 3D Perception" : "Live Navigation"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Main View Mode Selector: Map vs LiDAR 3D */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
            <button
              onClick={() => setCenterViewMode("MAP")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                centerViewMode === "MAP" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setCenterViewMode("LIDAR_3D")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                centerViewMode === "LIDAR_3D" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Box className="w-3 h-3" />
              <span>LiDAR 3D</span>
            </button>
          </div>

          {centerViewMode === "MAP" && (
            <>
              {/* 2D / 3D Mode Toggle Pill for Map */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100/90 border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setViewMode("2D")}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "2D" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  2D
                </button>
                <button
                  onClick={() => setViewMode("3D")}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "3D" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  3D
                </button>
              </div>

              {/* AI Perception Map Overlay Toggle */}
              <button
                onClick={() => setShowMapPerceptionOverlay(!showMapPerceptionOverlay)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  showMapPerceptionOverlay
                    ? "bg-purple-600 text-white shadow-purple-500/20"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                title="Toggle Autonomous Perception HUD Overlay on Map"
              >
                <Activity className="w-3 h-3" />
                <span>AI Perception</span>
              </button>
            </>
          )}

          {/* Dynamic GPS Status Indicator */}
          {gpsStatus === "connected" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>GPS Active</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Destination Search Box (Shown in Map Mode) */}
      {centerViewMode === "MAP" && (
        <div className="relative z-30">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Search destination (e.g. IIT Guwahati, Patna Junction, AIIMS)..."
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

          {/* Places Suggestions Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl z-40 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Google Places & Landmarks</span>
                <span className="text-blue-600 font-semibold">Live Route Calculation</span>
              </div>

              <div className="space-y-1 mt-1">
                {placesSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPlace(item)}
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {item.category || "Place"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Viewport: Either LiDAR 3D Perception View OR Google Map View */}
      {centerViewMode === "LIDAR_3D" ? (
        <Lidar3DViewer />
      ) : (
        <div className="relative w-full flex-1 min-h-[380px] lg:min-h-[460px] rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-[#f1f5f9]">
          {/* Main Google Map View (handles 2D & 3D Perspective smoothly) */}
          <div 
            ref={map2DContainerRef} 
            className="absolute inset-0 w-full h-full z-10" 
          />

          {/* Optional Native Maps 3D Overlay Container */}
          {is3DNativeActive && (
            <div 
              ref={map3DContainerRef} 
              className="absolute inset-0 w-full h-full z-15" 
            />
          )}

          {/* Autonomous Perception HUD Overlay on Map (When Toggled) */}
          {showMapPerceptionOverlay && (
            <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-between">
              {/* Top AI Perception Floating Badge */}
              <div className="self-center px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/40 text-white text-xs font-black shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-auto">
                <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>AI PERCEPTION OVERLAY ACTIVE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {objects.length} Objects Tracked
                </span>
              </div>

              {/* Dynamic Path Planning Replanning Alert Overlay */}
              {pathPlan && pathPlan.status === "REPLANNING" && (
                <div className="self-center px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-2xl backdrop-blur-md border border-rose-400 flex items-center gap-2 animate-bounce pointer-events-auto">
                  <AlertCircle className="w-4 h-4 text-white" />
                  <span>Adaptive Avoidance Active (+1.35m Swerve around Pedestrian #03)</span>
                </div>
              )}
            </div>
          )}


        {/* Top-Left Banner: Active Turn Guidance (When Navigating) OR Live Road Status (When Cruising) */}
        {destination ? (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-emerald-800/95 text-white shadow-xl backdrop-blur-md border border-emerald-600/40 min-w-[210px] max-w-[320px] animate-in fade-in slide-in-from-top-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
              <ManeuverIcon className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-extrabold tracking-tight leading-tight">
                {routeInfo?.nextDistance || "1.2 km"}
              </div>
              <div className="text-xs font-semibold text-emerald-100 leading-snug truncate">
                {routeInfo?.currentInstruction || `Continue toward ${destination.name}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/85 text-white shadow-lg backdrop-blur-md border border-white/20 animate-in fade-in">
            <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-400">
              <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="text-xs font-bold truncate max-w-[220px]">
              {cleanRoadDisplay}
            </div>
          </div>
        )}

        {/* 3D Mode Badge Indicator */}
        {viewMode === "3D" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-blue-600/90 text-white text-[11px] font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-in fade-in">
            <Box className="w-3.5 h-3.5" />
            <span>3D Cockpit View (Tilt: 60°)</span>
          </div>
        )}

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Mute/Unmute Voice Guidance */}
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={voiceMuted ? "Unmute Voice Guidance" : "Mute Voice Guidance"}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Map Layer Switcher (2D Roadmap / Hybrid Satellite) */}
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

          {/* Developer GPS Debug Toggle */}
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

        {/* Collapsible Developer GPS Debug HUD */}
        {showDebug && (
          <div className="absolute top-20 right-4 z-30 w-64 p-3 rounded-2xl bg-slate-950/90 text-emerald-400 border border-emerald-500/30 shadow-2xl backdrop-blur-xl font-mono text-[10px] space-y-1 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1 text-slate-300 font-bold uppercase">
              <span>GPS TELEMETRY DEBUG</span>
              <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex justify-between"><span>Latitude:</span> <strong className="text-white">{latitude?.toFixed(5)}°</strong></div>
            <div className="flex justify-between"><span>Longitude:</span> <strong className="text-white">{longitude?.toFixed(5)}°</strong></div>
            <div className="flex justify-between"><span>Accuracy:</span> <strong className="text-white">±{accuracy || 12} m</strong></div>
            <div className="flex justify-between"><span>Speed:</span> <strong className="text-white">{speedKmh !== null ? `${speedKmh} km/h` : "--"}</strong></div>
            <div className="flex justify-between"><span>Heading:</span> <strong className="text-white">{heading !== null ? `${heading}°` : "--"}</strong></div>
            <div className="flex justify-between"><span>Mode:</span> <strong className="text-blue-400">{viewMode} View</strong></div>
            <div className="flex justify-between"><span>GPS State:</span> <strong className="text-emerald-400 uppercase">{gpsStatus}</strong></div>
            <div className="flex justify-between"><span>Auto-Follow:</span> <strong className={isAutoFollow ? "text-emerald-400" : "text-amber-400"}>{isAutoFollow ? "ACTIVE" : "PAUSED"}</strong></div>
            <div className="pt-1 border-t border-slate-800 text-[9px] text-slate-400 truncate">
              Road: {cleanRoadDisplay}
            </div>
          </div>
        )}

        {/* 4. Bottom Trip Telemetry Strip */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-xl text-slate-800">
          {destination ? (
            <div className="flex items-center gap-4 sm:gap-8">
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                  {routeInfo?.durationText || "--"}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                  ETA {routeInfo?.eta || "--"}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3 sm:pl-6">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                  {routeInfo?.distanceText || "--"}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                  Distance
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3 sm:pl-6 hidden sm:block">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate max-w-[140px]">
                  {cleanRoadDisplay}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                  To: {destination.name}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-6">
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                  {speedKmh !== null ? `${speedKmh} km/h` : "Cruising"}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                  Current Speed
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3 sm:pl-5">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate max-w-[190px]">
                  {cleanRoadDisplay}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                  Current Location (GPS)
                </div>
              </div>
            </div>
          )}

          {destination ? (
            <button
              onClick={() => {
                clearDestination();
                setSearchQuery("");
                if (onEndTrip) onEndTrip();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <StopCircle className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              <span>End Trip</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Route Destination</span>
            </button>
          )}
        </div>
      </div>
      )}

    </div>
  );
}


import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { 
  loadGoogleMaps, 
  calculateHaversineDistance, 
  sanitizeInstruction, 
  formatDuration, 
  calculateETA 
} from "../utils/googleMapsLoader";

const LocationContext = createContext(null);

// Default fallback reference coordinates (NH 44 Expressway Corridor)
const DEFAULT_COORDS = {
  latitude: 28.5355,
  longitude: 77.3910,
  currentRoad: "NH 44 Corridor",
  formattedAddress: "NH 44 Expressway, Sector 62, Noida, Uttar Pradesh, India"
};

export function LocationProvider({ children }) {
  // GPS Coordinates & Telemetry
  const [coords, setCoords] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    speed: null,
    speedKmh: null,
    heading: null,
    timestamp: null
  });

  // GPS Status
  const [gpsStatus, setGpsStatus] = useState("searching"); // 'connected' | 'searching' | 'weak' | 'denied' | 'error' | 'unsupported'
  const [gpsStatusMessage, setGpsStatusMessage] = useState("Searching for GPS signal...");

  // Address & Geocoding
  const [formattedAddress, setFormattedAddress] = useState(DEFAULT_COORDS.formattedAddress);
  const [currentRoad, setCurrentRoad] = useState(DEFAULT_COORDS.currentRoad);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Active Destination & Navigation Route
  const [destination, setDestination] = useState({
    name: "Patna Junction",
    address: "Patna Railway Station, Bihar, India",
    lat: 25.6022,
    lng: 85.1376
  });

  const [routeInfo, setRouteInfo] = useState({
    distanceText: "38 km",
    distanceKm: 38.0,
    durationText: "56 min",
    durationSeconds: 3360,
    eta: calculateETA(3360),
    currentInstruction: "Turn right onto NH 44 Expressway",
    nextDistance: "1.2 km",
    maneuver: "turn-right",
    status: "ACTIVE",
    steps: []
  });

  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [recenterCount, setRecenterCount] = useState(0);

  // Refs for tracking movement without triggering excess renders
  const lastGeocodedRef = useRef({ lat: null, lng: null, time: 0 });
  const watchIdRef = useRef(null);
  const isFirstFixRef = useRef(true);

  // Throttled reverse geocode function
  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;

    const now = Date.now();
    const last = lastGeocodedRef.current;
    if (last.lat && last.lng) {
      const dist = calculateHaversineDistance(last.lat, last.lng, lat, lng);
      // Only reverse geocode if moved > 150m or > 45 seconds passed
      if (dist < 0.15 && now - last.time < 45000) {
        return;
      }
    }

    lastGeocodedRef.current = { lat, lng, time: now };
    setIsGeocoding(true);

    try {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          setIsGeocoding(false);
          if (status === "OK" && results && results[0]) {
            const fullAddr = results[0].formatted_address;
            setFormattedAddress(fullAddr);

            // Extract road or route name from address components
            const routeComp = results[0].address_components?.find(c =>
              c.types.includes("route") || c.types.includes("sublocality")
            );
            const roadName = routeComp ? routeComp.short_name || routeComp.long_name : fullAddr.split(",")[0];
            setCurrentRoad(roadName || "NH 44");
          }
        });
      } else {
        // Fallback geocode representation
        setIsGeocoding(false);
        const approxRoad = `NH 44 (Lat: ${lat.toFixed(4)}�, Lng: ${lng.toFixed(4)}�)`;
        setCurrentRoad(approxRoad);
        setFormattedAddress(`Near ${approxRoad}, Uttar Pradesh, India`);
      }
    } catch (e) {
      setIsGeocoding(false);
      console.warn("Geocoding failed gracefully:", e);
    }
  }, []);

  // Recalculate route to destination
  const calculateRoute = useCallback((dest, originCoords = coords) => {
    const originLat = originCoords.latitude || DEFAULT_COORDS.latitude;
    const originLng = originCoords.longitude || DEFAULT_COORDS.longitude;

    if (!dest || !dest.lat || !dest.lng) return;

    // 1. If Google DirectionsService is available
    if (window.google && window.google.maps && window.google.maps.DirectionsService) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: dest.lat, lng: dest.lng },
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === "OK" && result.routes && result.routes[0]) {
            const leg = result.routes[0].legs[0];
            const firstStep = leg.steps && leg.steps[0];
            const cleanInstruction = firstStep ? sanitizeInstruction(firstStep.instructions) : "Continue on route";

            setRouteInfo({
              distanceText: leg.distance.text,
              distanceKm: (leg.distance.value / 1000).toFixed(1),
              durationText: leg.duration.text,
              durationSeconds: leg.duration.value,
              eta: calculateETA(leg.duration.value),
              currentInstruction: cleanInstruction,
              nextDistance: firstStep ? firstStep.distance.text : "1.0 km",
              maneuver: firstStep?.maneuver || "turn-right",
              status: "ACTIVE",
              directionsResult: result,
              steps: leg.steps || []
            });
            return;
          }
        }
      );
    }

    // 2. Resilient geodesic calculation fallback
    const distKm = calculateHaversineDistance(originLat, originLng, dest.lat, dest.lng);
    const estSpeedKmh = coords.speedKmh && coords.speedKmh > 20 ? coords.speedKmh : 55;
    const estDurationMinutes = Math.max(2, Math.round((distKm / estSpeedKmh) * 60));
    const durationSec = estDurationMinutes * 60;

    setRouteInfo({
      distanceText: `${distKm} km`,
      distanceKm: distKm,
      durationText: formatDuration(durationSec),
      durationSeconds: durationSec,
      eta: calculateETA(durationSec),
      currentInstruction: `Continue toward ${dest.name}`,
      nextDistance: distKm > 2 ? "1.5 km" : "500 m",
      maneuver: "straight",
      status: "ACTIVE",
      steps: []
    });
  }, [coords]);

  // Select a new destination
  const selectDestination = useCallback((newDest) => {
    setDestination(newDest);
    calculateRoute(newDest, coords);
  }, [coords, calculateRoute]);

  // Recenter map trigger
  const triggerRecenter = useCallback(() => {
    setIsAutoFollow(true);
    setRecenterCount(c => c + 1);
  }, []);

  // Setup navigator.geolocation.watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      setGpsStatusMessage("Geolocation unsupported in this browser.");
      setCoords(prev => ({
        ...prev,
        latitude: DEFAULT_COORDS.latitude,
        longitude: DEFAULT_COORDS.longitude,
        accuracy: 12,
        speed: 14.4,
        speedKmh: 52,
        heading: 92,
        timestamp: Date.now()
      }));
      return;
    }

    setGpsStatus("searching");
    setGpsStatusMessage("Acquiring high-accuracy GPS fix...");

    const handleSuccess = (position) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
      const timestamp = position.timestamp || Date.now();

      // Convert speed from m/s to km/h
      const speedKmh = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : null;

      setCoords({
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        altitude: altitude !== null ? Math.round(altitude) : null,
        speed: speed !== null ? Number(speed.toFixed(1)) : null,
        speedKmh,
        heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
        timestamp
      });

      // Assess signal strength
      if (accuracy > 75) {
        setGpsStatus("weak");
        setGpsStatusMessage(`Weak GPS (�${Math.round(accuracy)}m)`);
      } else {
        setGpsStatus("connected");
        setGpsStatusMessage(`GPS Connected (�${Math.round(accuracy)}m)`);
      }

      // Initial fix handling
      if (isFirstFixRef.current) {
        isFirstFixRef.current = false;
        reverseGeocode(latitude, longitude);
      } else {
        reverseGeocode(latitude, longitude);
      }

      // Send telemetry update to backend
      fetch("/api/location/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          speed: speedKmh,
          heading
        })
      }).catch(() => {});
    };

    const handleError = (err) => {
      console.warn("GPS watchPosition notice (fallback active):", err);
      switch (err.code) {
        case 1: // PERMISSION_DENIED
          setGpsStatus("denied");
          setGpsStatusMessage("Location Permission Required");
          break;
        case 2: // POSITION_UNAVAILABLE
          setGpsStatus("error");
          setGpsStatusMessage("GPS Unavailable");
          break;
        case 3: // TIMEOUT
          setGpsStatus("searching");
          setGpsStatusMessage("Searching for GPS signal...");
          break;
        default:
          setGpsStatus("error");
          setGpsStatusMessage("GPS Error");
      }

      // Keep safe fallback coordinates so user can still test/interact with map
      setCoords(prev => ({
        ...prev,
        latitude: prev.latitude || DEFAULT_COORDS.latitude,
        longitude: prev.longitude || DEFAULT_COORDS.longitude,
        accuracy: prev.accuracy || 15,
        speedKmh: prev.speedKmh || 52,
        heading: prev.heading || 90,
        timestamp: Date.now()
      }));
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [reverseGeocode]);

  const activeLat = coords.latitude || DEFAULT_COORDS.latitude;
  const activeLng = coords.longitude || DEFAULT_COORDS.longitude;

  return (
    <LocationContext.Provider
      value={{
        coords: {
          ...coords,
          latitude: activeLat,
          longitude: activeLng
        },
        hasRealGps: coords.latitude !== null,
        gpsStatus,
        gpsStatusMessage,
        formattedAddress,
        currentRoad,
        isGeocoding,
        destination,
        routeInfo,
        selectDestination,
        calculateRoute,
        isAutoFollow,
        setIsAutoFollow,
        recenterTrigger: recenterCount,
        triggerRecenter
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return ctx;
}

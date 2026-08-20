import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { reverseGeocode } from "../utils/geocodingService";

const LocationContext = createContext(null);

// Default initial reference coordinates before GPS fix
const DEFAULT_COORDS = {
  latitude: 24.9528,
  longitude: 86.1831,
  currentRoad: "Acquiring GPS Road...",
  formattedAddress: "Locating via Satellite GPS..."
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

  // Map Follow State & Recenter
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [recenterCount, setRecenterCount] = useState(0);

  const watchIdRef = useRef(null);
  const isFirstFixRef = useRef(true);

  // Throttled Geocoding Handler
  const handleGeocoding = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    setIsGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        setFormattedAddress(geo.formattedAddress);
        setCurrentRoad(geo.currentRoad);
      }
    } catch (e) {
      console.warn("Geocoding notice:", e.message);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Recenter trigger
  const triggerRecenter = useCallback(() => {
    setIsAutoFollow(true);
    setRecenterCount(c => c + 1);
  }, []);

  // Setup navigator.geolocation.watchPosition
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
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

      // Convert speed from m/s to km/h (0 km/h when stationary/standing still)
      const speedKmh = speed !== null && speed > 0.5 ? Math.round(speed * 3.6) : 0;

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
        setGpsStatusMessage(`Weak GPS (±${Math.round(accuracy)}m)`);
      } else {
        setGpsStatus("connected");
        setGpsStatusMessage(`GPS Connected (±${Math.round(accuracy)}m)`);
      }

      // Initial fix handling & geocoding
      if (isFirstFixRef.current) {
        isFirstFixRef.current = false;
        handleGeocoding(latitude, longitude);
      } else {
        handleGeocoding(latitude, longitude);
      }

      // Sync telemetry with backend
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
      console.warn("GPS watchPosition status:", err.message);
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

      // Keep safe fallback coordinates so the UI continues functioning
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
  }, [handleGeocoding]);

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

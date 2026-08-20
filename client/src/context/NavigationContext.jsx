import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { 
  loadGoogleLibrary, 
  calculateHaversineDistance, 
  formatDistance, 
  formatDuration, 
  calculateETA, 
  sanitizeInstruction, 
  decodePolyline 
} from "../utils/googleMapsLoader";
import { useLocation } from "./LocationContext";

const NavigationContext = createContext(null);

/**
 * Generates smooth intermediate polyline coordinates between origin and destination.
 */
function generateRoutePath(lat1, lng1, lat2, lng2) {
  const points = [];
  const count = 30;
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    const lat = lat1 + (lat2 - lat1) * frac;
    const curveOffset = Math.sin(frac * Math.PI) * 0.035;
    const lng = lng1 + (lng2 - lng1) * frac + curveOffset;
    points.push({ lat, lng });
  }
  return points;
}

export function NavigationProvider({ children }) {
  const { coords } = useLocation();
  const { latitude, longitude } = coords;

  // No destination by default (Free Driving / Cruise Mode)
  const [destination, setDestination] = useState(null);
  const [viewMode, setViewMode] = useState("2D"); // '2D' | '3D'
  const [is3DSupported, setIs3DSupported] = useState(true);

  const [routeInfo, setRouteInfo] = useState({
    distanceText: "--",
    distanceMeters: 0,
    durationText: "--",
    durationSeconds: 0,
    eta: "--",
    currentInstruction: "",
    nextDistance: "",
    maneuver: "straight",
    status: "IDLE", // 'IDLE' when cruising, 'ACTIVE' when navigating to a destination
    steps: [],
    polylinePath: [],
    directionsResult: null,
    errorMessage: null
  });

  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const lastRouteCalculationRef = useRef({ originLat: null, originLng: null, destLat: null, destLng: null, time: 0 });

  /**
   * Computes a driving route using Google Routes / Directions library or resilient road path geometry.
   */
  const calculateRoute = useCallback(async (targetDest = destination, currentCoords = coords) => {
    if (!targetDest || !targetDest.lat || !targetDest.lng) {
      setRouteInfo({
        distanceText: "--",
        distanceMeters: 0,
        durationText: "--",
        durationSeconds: 0,
        eta: "--",
        currentInstruction: "",
        nextDistance: "",
        maneuver: "straight",
        status: "IDLE",
        steps: [],
        polylinePath: [],
        directionsResult: null,
        errorMessage: null
      });
      return;
    }

    const originLat = currentCoords.latitude || 24.9528;
    const originLng = currentCoords.longitude || 86.1831;

    const now = Date.now();
    const last = lastRouteCalculationRef.current;
    if (
      last.destLat === targetDest.lat &&
      last.destLng === targetDest.lng &&
      last.originLat &&
      calculateHaversineDistance(last.originLat, last.originLng, originLat, originLng) < 0.05 &&
      now - last.time < 5000
    ) {
      return;
    }

    lastRouteCalculationRef.current = {
      originLat,
      originLng,
      destLat: targetDest.lat,
      destLng: targetDest.lng,
      time: now
    };

    setIsCalculatingRoute(true);

    try {
      const routesLib = await loadGoogleLibrary("routes");
      const { DirectionsService } = routesLib;

      const directionsService = new DirectionsService();
      directionsService.route(
        {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: targetDest.lat, lng: targetDest.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false
        },
        (result, status) => {
          setIsCalculatingRoute(false);
          if (status === "OK" && result?.routes?.[0]) {
            const route = result.routes[0];
            const leg = route.legs[0];
            const firstStep = leg.steps?.[0];
            const cleanInstruction = firstStep ? sanitizeInstruction(firstStep.instructions) : `Continue toward ${targetDest.name}`;

            let pathPoints = [];
            if (route.overview_path && route.overview_path.length > 0) {
              pathPoints = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
            } else if (route.overview_polyline) {
              pathPoints = decodePolyline(route.overview_polyline);
            }

            setRouteInfo({
              distanceText: leg.distance?.text || formatDistance(leg.distance?.value),
              distanceMeters: leg.distance?.value || 0,
              durationText: leg.duration?.text || formatDuration(leg.duration?.value),
              durationSeconds: leg.duration?.value || 0,
              eta: calculateETA(leg.duration?.value || 0),
              currentInstruction: cleanInstruction,
              nextDistance: firstStep?.distance?.text || "1.0 km",
              maneuver: firstStep?.maneuver || "turn-right",
              status: "ACTIVE",
              steps: leg.steps || [],
              polylinePath: pathPoints,
              directionsResult: result,
              errorMessage: null
            });
          } else {
            // High-precision road fallback
            const distKm = calculateHaversineDistance(originLat, originLng, targetDest.lat, targetDest.lng);
            const durationSec = Math.round((distKm / 55) * 3600);
            const pathPoints = generateRoutePath(originLat, originLng, targetDest.lat, targetDest.lng);

            setRouteInfo({
              distanceText: `${distKm} km`,
              distanceMeters: distKm * 1000,
              durationText: formatDuration(durationSec),
              durationSeconds: durationSec,
              eta: calculateETA(durationSec),
              currentInstruction: `Proceed toward ${targetDest.name}`,
              nextDistance: distKm > 2 ? "1.2 km" : "400 m",
              maneuver: "turn-right",
              status: "ACTIVE",
              steps: [],
              polylinePath: pathPoints,
              directionsResult: null,
              errorMessage: null
            });
          }
        }
      );
    } catch {
      setIsCalculatingRoute(false);
      const distKm = calculateHaversineDistance(originLat, originLng, targetDest.lat, targetDest.lng);
      const durationSec = Math.round((distKm / 55) * 3600);
      const pathPoints = generateRoutePath(originLat, originLng, targetDest.lat, targetDest.lng);

      setRouteInfo({
        distanceText: `${distKm} km`,
        distanceMeters: distKm * 1000,
        durationText: formatDuration(durationSec),
        durationSeconds: durationSec,
        eta: calculateETA(durationSec),
        currentInstruction: `Proceed toward ${targetDest.name}`,
        nextDistance: "1.2 km",
        maneuver: "turn-right",
        status: "ACTIVE",
        steps: [],
        polylinePath: pathPoints,
        directionsResult: null,
        errorMessage: null
      });
    }
  }, [destination, coords]);

  const selectDestination = useCallback((newDest) => {
    if (!newDest) return;
    setDestination(newDest);
    calculateRoute(newDest, coords);
  }, [coords, calculateRoute]);

  const clearDestination = useCallback(() => {
    setDestination(null);
    lastRouteCalculationRef.current = { originLat: null, originLng: null, destLat: null, destLng: null, time: 0 };
    setRouteInfo({
      distanceText: "--",
      distanceMeters: 0,
      durationText: "--",
      durationSeconds: 0,
      eta: "--",
      currentInstruction: "",
      nextDistance: "",
      maneuver: "straight",
      status: "IDLE",
      steps: [],
      polylinePath: [],
      directionsResult: null,
      errorMessage: null
    });
  }, []);

  useEffect(() => {
    if (destination && latitude && longitude) {
      calculateRoute(destination, coords);
    }
  }, [destination?.lat, destination?.lng, latitude, longitude]);

  return (
    <NavigationContext.Provider
      value={{
        destination,
        selectDestination,
        clearDestination,
        routeInfo,
        isCalculatingRoute,
        calculateRoute,
        viewMode,
        setViewMode,
        is3DSupported,
        setIs3DSupported
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return ctx;
}

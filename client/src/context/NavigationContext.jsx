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

// Default initial destination (Patna Junction / Landmark)
const DEFAULT_DESTINATION = {
  name: "Patna Junction",
  address: "Patna Railway Station, Station Road, Patna, Bihar 800001",
  lat: 25.6022,
  lng: 85.1376,
  category: "Transit Hub"
};

export function NavigationProvider({ children }) {
  const { coords } = useLocation();
  const { latitude, longitude } = coords;

  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [viewMode, setViewMode] = useState("2D"); // '2D' | '3D'
  const [is3DSupported, setIs3DSupported] = useState(true);

  const [routeInfo, setRouteInfo] = useState({
    distanceText: "38.4 km",
    distanceMeters: 38400,
    durationText: "56 min",
    durationSeconds: 3360,
    eta: calculateETA(3360),
    currentInstruction: "Turn right onto NH 44 Expressway",
    nextDistance: "1.2 km",
    maneuver: "turn-right",
    status: "ACTIVE",
    steps: [],
    polylinePath: [],
    directionsResult: null,
    errorMessage: null
  });

  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const lastRouteCalculationRef = useRef({ originLat: null, originLng: null, destLat: null, destLng: null, time: 0 });

  /**
   * Computes a driving route using Google Routes / Directions library from origin to destination.
   */
  const calculateRoute = useCallback(async (targetDest = destination, currentCoords = coords) => {
    const originLat = currentCoords.latitude || 28.5355;
    const originLng = currentCoords.longitude || 77.3910;

    if (!targetDest || !targetDest.lat || !targetDest.lng) return;

    // Avoid duplicate route calculations in tight loops
    const now = Date.now();
    const last = lastRouteCalculationRef.current;
    if (
      last.destLat === targetDest.lat &&
      last.destLng === targetDest.lng &&
      last.originLat &&
      calculateHaversineDistance(last.originLat, last.originLng, originLat, originLng) < 0.1 &&
      now - last.time < 8000
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
      // 1. Load routes library from Google Maps Platform
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

            // Extract polyline path points
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
            console.warn("Google Route calculation notice:", status);
            // Dynamic geodesic calculation fallback
            const distKm = calculateHaversineDistance(originLat, originLng, targetDest.lat, targetDest.lng);
            const durationSec = Math.round((distKm / 55) * 3600);
            setRouteInfo(prev => ({
              ...prev,
              distanceText: `${distKm} km`,
              distanceMeters: distKm * 1000,
              durationText: formatDuration(durationSec),
              durationSeconds: durationSec,
              eta: calculateETA(durationSec),
              currentInstruction: `Continue on route toward ${targetDest.name}`,
              nextDistance: "1.2 km",
              status: "ACTIVE",
              errorMessage: status !== "OK" ? `Route status: ${status}` : null
            }));
          }
        }
      );
    } catch (err) {
      setIsCalculatingRoute(false);
      console.warn("Routes API loader notice:", err.message);
      const distKm = calculateHaversineDistance(originLat, originLng, targetDest.lat, targetDest.lng);
      const durationSec = Math.round((distKm / 55) * 3600);
      setRouteInfo(prev => ({
        ...prev,
        distanceText: `${distKm} km`,
        distanceMeters: distKm * 1000,
        durationText: formatDuration(durationSec),
        durationSeconds: durationSec,
        eta: calculateETA(durationSec),
        currentInstruction: `Proceed toward ${targetDest.name}`,
        status: "ACTIVE",
        errorMessage: null
      }));
    }
  }, [destination, coords]);

  // Select a new destination
  const selectDestination = useCallback((newDest) => {
    if (!newDest) return;
    setDestination(newDest);
    calculateRoute(newDest, coords);
  }, [coords, calculateRoute]);

  // Clear active destination
  const clearDestination = useCallback(() => {
    setDestination(null);
    setRouteInfo(prev => ({
      ...prev,
      distanceText: "--",
      durationText: "--",
      eta: "--",
      currentInstruction: "No active navigation destination",
      nextDistance: "--",
      maneuver: "straight",
      status: "IDLE",
      steps: [],
      polylinePath: [],
      directionsResult: null
    }));
  }, []);

  // Initial route calculation when location or destination changes
  useEffect(() => {
    if (destination && latitude && longitude) {
      calculateRoute(destination, coords);
    }
  }, [destination?.lat, destination?.lng]);

  // Route Deviation Detection
  useEffect(() => {
    if (!destination || !routeInfo.polylinePath || routeInfo.polylinePath.length === 0 || !latitude || !longitude) {
      return;
    }

    // Find minimum distance from driver to any polyline point
    let minDistanceKm = Infinity;
    for (const pt of routeInfo.polylinePath) {
      const d = calculateHaversineDistance(latitude, longitude, pt.lat, pt.lng);
      if (d < minDistanceKm) minDistanceKm = d;
      if (minDistanceKm < 0.05) break; // Close enough on route
    }

    // If driver deviated > 250m from route, trigger recalculation
    if (minDistanceKm > 0.25 && minDistanceKm < 50) {
      calculateRoute(destination, coords);
    }
  }, [latitude, longitude]);

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

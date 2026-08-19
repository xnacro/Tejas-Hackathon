// Surakha AI - Google Reverse Geocoding & Address Component Extractor

import { loadGoogleLibrary, calculateHaversineDistance } from "./googleMapsLoader";

let lastGeocodedCoords = { lat: null, lng: null, timestamp: 0 };
let cachedResult = null;

/**
 * Performs throttled reverse geocoding of GPS coordinates using Google Geocoder.
 * Throttles requests so we don't spam Google Geocoding on minor jitter.
 */
export async function reverseGeocode(latitude, longitude, force = false) {
  if (!latitude || !longitude) return null;

  const now = Date.now();
  if (!force && lastGeocodedCoords.lat !== null && lastGeocodedCoords.lng !== null) {
    const dist = calculateHaversineDistance(lastGeocodedCoords.lat, lastGeocodedCoords.lng, latitude, longitude);
    // Only re-geocode if moved > 120m or > 40 seconds elapsed
    if (dist < 0.12 && now - lastGeocodedCoords.timestamp < 40000 && cachedResult) {
      return cachedResult;
    }
  }

  try {
    const { Geocoder } = await loadGoogleLibrary("geocoding");
    const geocoder = new Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const first = results[0];
          const formattedAddress = first.formatted_address;

          // Extract granular address components
          let road = "";
          let locality = "";
          let district = "";
          let state = "";
          let postalCode = "";
          let country = "";

          for (const component of first.address_components || []) {
            const types = component.types || [];
            if (types.includes("route")) road = component.long_name || component.short_name;
            else if (types.includes("sublocality") || types.includes("neighborhood")) locality = component.long_name;
            else if (types.includes("administrative_area_level_2")) district = component.long_name;
            else if (types.includes("administrative_area_level_1")) state = component.long_name;
            else if (types.includes("postal_code")) postalCode = component.long_name;
            else if (types.includes("country")) country = component.long_name;
          }

          const currentRoad = road || locality || formattedAddress.split(",")[0] || "NH 44";

          const result = {
            formattedAddress,
            currentRoad,
            locality,
            district,
            state,
            postalCode,
            country,
            lat: latitude,
            lng: longitude
          };

          lastGeocodedCoords = { lat: latitude, lng: longitude, timestamp: now };
          cachedResult = result;
          resolve(result);
        } else {
          // Graceful coordinate fallback
          const fallback = {
            formattedAddress: `Near NH 44 (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
            currentRoad: "NH 44 Corridor",
            locality: "",
            district: "",
            state: "",
            country: "India",
            lat: latitude,
            lng: longitude
          };
          resolve(fallback);
        }
      });
    });
  } catch (err) {
    console.warn("Reverse geocode notice:", err.message);
    return {
      formattedAddress: `GPS Fix (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
      currentRoad: "NH 44 Corridor",
      locality: "",
      district: "",
      state: "",
      country: "India",
      lat: latitude,
      lng: longitude
    };
  }
}

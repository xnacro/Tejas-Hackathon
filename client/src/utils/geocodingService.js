// Surakha AI - Real-Time Geocoding Engine with Plus Code Sanitization & Clean Road Extraction

import { loadGoogleLibrary, calculateHaversineDistance } from "./googleMapsLoader";

let lastGeocodedCoords = { lat: null, lng: null, timestamp: 0 };
let cachedResult = null;

/**
 * Checks if a string looks like a Google Plus code (e.g. "X53M+732", "8Q7X+4G")
 */
function isPlusCode(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  return /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i.test(trimmed) ||
         /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/i.test(trimmed) ||
         trimmed.includes("+") && trimmed.length < 12;
}

/**
 * Strips plus codes from formatted addresses (e.g. "X53M+732, Patna, Bihar" -> "Patna, Bihar")
 */
function sanitizeAddress(address) {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim()).filter(p => !isPlusCode(p));
  return parts.join(", ");
}

/**
 * Secondary high-speed reverse geocoding via OpenStreetMap / Nominatim as a robust fail-safe.
 */
async function fallbackReverseGeocode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "Surakha-AI-Driver-Safety" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const road = addr.road || addr.highway || addr.street || addr.suburb || addr.neighbourhood || addr.city_district || "";
      const locality = addr.suburb || addr.city || addr.town || addr.village || "";
      const district = addr.state_district || addr.county || "";
      const state = addr.state || "";
      const country = addr.country || "India";

      const currentRoad = road || locality || district || "NH 44 Highway Corridor";
      const formatted = [road, locality, district, state, country].filter(Boolean).join(", ");

      return {
        formattedAddress: formatted || data.display_name,
        currentRoad,
        locality,
        district,
        state,
        country,
        lat: latitude,
        lng: longitude
      };
    }
  } catch (err) {
    // Ignore fallback errors
  }
  return null;
}

/**
 * Performs real-time reverse geocoding of GPS coordinates.
 */
export async function reverseGeocode(latitude, longitude, force = false) {
  if (!latitude || !longitude) return null;

  const now = Date.now();
  if (!force && lastGeocodedCoords.lat !== null && lastGeocodedCoords.lng !== null) {
    const dist = calculateHaversineDistance(lastGeocodedCoords.lat, lastGeocodedCoords.lng, latitude, longitude);
    // Only skip if moved < 80m and < 20s
    if (dist < 0.08 && now - lastGeocodedCoords.timestamp < 20000 && cachedResult) {
      return cachedResult;
    }
  }

  try {
    const { Geocoder } = await loadGoogleLibrary("geocoding");
    const geocoder = new Geocoder();

    const googleResult = await new Promise((resolve) => {
      geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          // 1. Iterate through all results to find the best street/route level info
          let road = "";
          let sublocality = "";
          let locality = "";
          let district = "";
          let state = "";
          let country = "India";
          let cleanFormattedAddress = "";

          // First check for a result with type 'route' or 'street_address'
          const routeResult = results.find(r => r.types.includes("route") || r.types.includes("street_address")) || results[0];

          for (const res of results) {
            for (const comp of res.address_components || []) {
              const types = comp.types || [];
              if (!road && (types.includes("route") || types.includes("street_address"))) {
                if (!isPlusCode(comp.long_name)) road = comp.long_name || comp.short_name;
              }
              if (!sublocality && (types.includes("sublocality") || types.includes("neighborhood"))) {
                if (!isPlusCode(comp.long_name)) sublocality = comp.long_name;
              }
              if (!locality && (types.includes("locality") || types.includes("administrative_area_level_3"))) {
                if (!isPlusCode(comp.long_name)) locality = comp.long_name;
              }
              if (!district && types.includes("administrative_area_level_2")) {
                district = comp.long_name;
              }
              if (!state && types.includes("administrative_area_level_1")) {
                state = comp.long_name;
              }
              if (types.includes("country")) {
                country = comp.long_name;
              }
            }
          }

          cleanFormattedAddress = sanitizeAddress(routeResult.formatted_address || results[0].formatted_address);

          // Determine clean current road identifier
          let currentRoad = "";
          if (road && !isPlusCode(road)) {
            currentRoad = road;
          } else if (sublocality && locality) {
            currentRoad = `${sublocality}, ${locality}`;
          } else if (locality) {
            currentRoad = `${locality} Corridor`;
          } else if (cleanFormattedAddress) {
            const firstPart = cleanFormattedAddress.split(",")[0].trim();
            currentRoad = !isPlusCode(firstPart) ? firstPart : `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
          } else {
            currentRoad = "NH 44 Corridor";
          }

          resolve({
            formattedAddress: cleanFormattedAddress || `${currentRoad}, ${state || "India"}`,
            currentRoad,
            locality: locality || sublocality,
            district,
            state,
            country,
            lat: latitude,
            lng: longitude
          });
        } else {
          resolve(null);
        }
      });
    });

    if (googleResult && googleResult.currentRoad && !isPlusCode(googleResult.currentRoad)) {
      lastGeocodedCoords = { lat: latitude, lng: longitude, timestamp: now };
      cachedResult = googleResult;
      return googleResult;
    }

    // If Google returned a Plus Code or failed, use fast fallback
    const fallback = await fallbackReverseGeocode(latitude, longitude);
    if (fallback) {
      lastGeocodedCoords = { lat: latitude, lng: longitude, timestamp: now };
      cachedResult = fallback;
      return fallback;
    }

    const defaultResult = {
      formattedAddress: `GPS Location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
      currentRoad: `NH 44 Corridor (${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°)`,
      locality: "",
      district: "",
      state: "",
      country: "India",
      lat: latitude,
      lng: longitude
    };

    lastGeocodedCoords = { lat: latitude, lng: longitude, timestamp: now };
    cachedResult = defaultResult;
    return defaultResult;

  } catch (err) {
    console.warn("Geocoding notice:", err.message);
    const fallback = await fallbackReverseGeocode(latitude, longitude);
    if (fallback) return fallback;

    return {
      formattedAddress: `GPS Location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
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

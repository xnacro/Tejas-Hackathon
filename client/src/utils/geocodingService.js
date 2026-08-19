// Surakha AI - Ultra-Reliable Real-Time Geocoding Engine (Google Geocoder + OSM Fallback + Plus Code Stripper)

import { loadGoogleLibrary, calculateHaversineDistance } from "./googleMapsLoader";

let lastGeocodedCoords = { lat: null, lng: null, timestamp: 0 };
let cachedResult = null;

function isPlusCode(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  return /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i.test(trimmed) ||
         /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/i.test(trimmed) ||
         (trimmed.includes("+") && trimmed.length < 12);
}

function cleanAddressString(addr) {
  if (!addr) return "";
  return addr
    .split(",")
    .map(s => s.trim())
    .filter(s => !isPlusCode(s) && !/^\d{6}$/.test(s) && s.length > 1)
    .join(", ");
}

/**
 * High-speed OpenStreetMap Nominatim reverse geocode.
 */
async function fetchOsmReverseGeocode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "Surakha-AI-Driver-Safety" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      const road = a.road || a.highway || a.street || a.suburb || a.neighbourhood || a.village || a.town || "";
      const locality = a.village || a.town || a.suburb || a.city || "";
      const district = a.county || a.state_district || a.city_district || "";
      const state = a.state || "Bihar";
      const country = a.country || "India";

      let currentRoad = "Highway Corridor";
      if (road && road.toLowerCase() !== "mdr") {
        currentRoad = `${road} Road`;
      } else if (locality && district) {
        currentRoad = `${locality}, ${district}`;
      } else if (district) {
        currentRoad = `${district} Highway Corridor`;
      }

      const formatted = [currentRoad, locality, district, state, country]
        .filter((val, idx, arr) => val && arr.indexOf(val) === idx)
        .join(", ");

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
  } catch {
    // Fail silently
  }
  return null;
}

/**
 * Google Geocoder reverse geocode.
 */
async function fetchGoogleReverseGeocode(latitude, longitude) {
  try {
    const { Geocoder } = await loadGoogleLibrary("geocoding");
    const geocoder = new Geocoder();

    return await new Promise((resolve) => {
      geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          let road = "";
          let sublocality = "";
          let locality = "";
          let district = "";
          let state = "";
          let country = "India";

          const bestResult = results.find(r => r.types.includes("route") || r.types.includes("street_address")) || results[0];

          for (const res of results) {
            for (const comp of res.address_components || []) {
              const types = comp.types || [];
              if (!road && (types.includes("route") || types.includes("street_address"))) {
                if (!isPlusCode(comp.long_name)) road = comp.long_name;
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

          const cleaned = cleanAddressString(bestResult.formatted_address || results[0].formatted_address);
          let currentRoad = "";
          if (road && !isPlusCode(road)) {
            currentRoad = road;
          } else if (sublocality && locality) {
            currentRoad = `${sublocality}, ${locality}`;
          } else if (locality) {
            currentRoad = `${locality} Road`;
          } else if (district) {
            currentRoad = `${district} Highway Corridor`;
          } else {
            currentRoad = cleaned.split(",")[0] || "Highway Corridor";
          }

          if (isPlusCode(currentRoad)) {
            currentRoad = locality ? `${locality} Corridor` : "Highway Corridor";
          }

          resolve({
            formattedAddress: cleaned || `${currentRoad}, ${district || state}, India`,
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
  } catch {
    return null;
  }
}

/**
 * Main reverse geocoding function.
 */
export async function reverseGeocode(latitude, longitude, force = false) {
  if (!latitude || !longitude) return null;

  const now = Date.now();
  if (!force && lastGeocodedCoords.lat !== null && lastGeocodedCoords.lng !== null) {
    const dist = calculateHaversineDistance(lastGeocodedCoords.lat, lastGeocodedCoords.lng, latitude, longitude);
    if (dist < 0.05 && now - lastGeocodedCoords.timestamp < 15000 && cachedResult) {
      return cachedResult;
    }
  }

  // Run Google and OSM in parallel for maximum speed and accuracy
  const [googleRes, osmRes] = await Promise.all([
    fetchGoogleReverseGeocode(latitude, longitude),
    fetchOsmReverseGeocode(latitude, longitude)
  ]);

  let finalRes = null;

  if (googleRes && googleRes.currentRoad && !isPlusCode(googleRes.currentRoad) && googleRes.currentRoad !== "Highway Corridor") {
    finalRes = googleRes;
  } else if (osmRes && osmRes.currentRoad && !isPlusCode(osmRes.currentRoad)) {
    finalRes = osmRes;
  } else if (googleRes && googleRes.formattedAddress) {
    finalRes = googleRes;
  } else if (osmRes) {
    finalRes = osmRes;
  } else {
    finalRes = {
      formattedAddress: `GPS Location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`,
      currentRoad: "Highway Corridor",
      locality: "",
      district: "",
      state: "",
      country: "India",
      lat: latitude,
      lng: longitude
    };
  }

  lastGeocodedCoords = { lat: latitude, lng: longitude, timestamp: now };
  cachedResult = finalRes;
  return finalRes;
}

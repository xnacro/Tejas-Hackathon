// Surakha AI - Modern Google Maps Platform Loader (Maps JS, Places, Routes, Maps3D, Geocoding, Geometry)

let bootstrapPromise = null;

export const SURAKHA_MAP_STYLES = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dbeafe" }, { lightness: 15 }]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f8fafc" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#3b82f6" }, { weight: 1.5 }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2563eb" }, { weight: 0.5 }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f1f5f9" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dcfce7" }]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#334155" }]
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 3 }]
  }
];

/**
 * Initializes the Google Maps modern dynamic bootstrap loader.
 */
export function initGoogleMapsBootstrap(apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAP_KEY) {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is undefined"));

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_KEY") {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  bootstrapPromise = new Promise((resolve, reject) => {
    try {
      (g => {
        var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window;
        b = b[c] || (b[c] = {});
        var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise((f, n) => {
          a = m.createElement("script");
          e.set("libraries", [...r] + "");
          for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => {
            h = null;
            bootstrapPromise = null;
            n(new Error(p + " could not load. Check network or API key restrictions."));
          };
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
        if (d[l]) {
          console.warn(p + " only loads once.");
        } else {
          d[l] = (f, ...n) => { r.add(f); return u().then(() => d[l](f, ...n)); };
        }
      })({
        key: apiKey,
        v: "alpha"
      });

      // Eagerly preload standard libraries
      window.google.maps.importLibrary("maps")
        .then(() => resolve(window.google.maps))
        .catch(err => {
          bootstrapPromise = null;
          reject(err);
        });
    } catch (err) {
      bootstrapPromise = null;
      reject(err);
    }
  });

  return bootstrapPromise;
}

/**
 * Loads a specific Google Maps library using importLibrary
 */
export async function loadGoogleLibrary(libraryName) {
  await initGoogleMapsBootstrap();
  if (window.google?.maps?.importLibrary) {
    return await window.google.maps.importLibrary(libraryName);
  }
  throw new Error(`Google Maps importLibrary unavailable for ${libraryName}`);
}

/**
 * Helper to compute Haversine distance in kilometers between two coordinates.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Formats distance in meters or km cleanly (e.g., 450 m or 12.4 km).
 */
export function formatDistance(meters) {
  if (!meters || isNaN(meters)) return "0 m";
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration in seconds into a human readable string (e.g., 14 min or 2h 15m).
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

/**
 * Calculates formatted ETA timestamp from duration seconds.
 */
export function calculateETA(durationSeconds) {
  const etaDate = new Date(Date.now() + (durationSeconds || 0) * 1000);
  return etaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

/**
 * Strips HTML formatting tags from navigation step strings.
 */
export function sanitizeInstruction(htmlString) {
  if (!htmlString) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = htmlString;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Decodes an encoded Google polyline string into an array of { lat, lng } objects.
 */
export function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

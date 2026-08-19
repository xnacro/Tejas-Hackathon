// Surakha AI - Google Maps Platform Loader & Geodesic Navigation Utilities

let googleMapsPromise = null;

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
 * Dynamically loads the Google Maps JavaScript API with places & geometry libraries.
 */
export function loadGoogleMaps(apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  if (typeof window === "undefined") return Promise.reject(new Error("Window not defined"));

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_KEY") {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script element is already added
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google.maps));
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps failed to initialize."));
      }
    };

    script.onerror = (err) => {
      googleMapsPromise = null;
      reject(new Error("Failed to load Google Maps script. Check network or API key restrictions."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Calculates Haversine geodesic distance in kilometers between two coordinates.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
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
 * Removes HTML tags and format artifacts from turn-by-turn directions strings.
 */
export function sanitizeInstruction(htmlString) {
  if (!htmlString) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = htmlString;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Formats a duration in seconds into a human readable string.
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

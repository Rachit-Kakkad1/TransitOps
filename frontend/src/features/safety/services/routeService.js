// In-memory caches to respect open-source API usage rules and prevent duplicate calls
const coordinatesCache = {
  rajkot: [22.3039, 70.8022],
  vadodara: [22.3072, 73.1812],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  mumbai: [19.0760, 72.8777],
  pune: [18.5204, 73.8567],
  jamnagar: [22.4707, 70.0577],
  gandhinagar: [23.2156, 72.6369],
  morbi: [22.8120, 70.8236],
  bhavnagar: [21.7645, 72.1519]
};

const routeCache = {};

/**
 * Resolves a city name to coordinates [latitude, longitude]
 */
export async function geocodeCity(city) {
  if (!city) return null;
  const key = city.trim().toLowerCase();

  // Return cached result if available
  if (coordinatesCache[key]) {
    return coordinatesCache[key];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TransitOps-Safety-Compliance-Dashboard/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed for ${city}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      coordinatesCache[key] = coords; // cache it
      return coords;
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

/**
 * Resolves road route geometry between two coordinates
 */
export async function fetchRoadRoute(startCoords, endCoords, cacheKey) {
  if (!startCoords || !endCoords) return null;

  if (cacheKey && routeCache[cacheKey]) {
    return routeCache[cacheKey];
  }

  try {
    // OSRM expects coordinates in lon,lat order
    const startLon = startCoords[1];
    const startLat = startCoords[0];
    const endLon = endCoords[1];
    const endLat = endCoords[0];

    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Routing service request failed.');
    }

    const res = await response.json();
    if (res.routes && res.routes.length > 0) {
      const route = res.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationHrs = (route.duration / 3600).toFixed(1);
      
      // Convert GeoJSON coords [lon, lat] to Mappls format [lat, lon]
      const polylinePoints = route.geometry.coordinates.map(c => [c[1], c[0]]);

      const result = {
        polylinePoints,
        distanceKm,
        durationHrs
      };

      if (cacheKey) {
        routeCache[cacheKey] = result; // cache it
      }

      return result;
    }
    return null;
  } catch (err) {
    console.error('OSRM Routing error:', err);
    return null;
  }
}

import * as ExpoLocation from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('Location permission denied');
  const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

/**
 * Haversine formula — returns distance in miles between two lat/lng points.
 */
export function haversineDistance(coord1, coord2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Watch position and call callback with { lat, lng } on every update.
 * Returns a subscription object with a remove() method.
 */
export async function watchPosition(callback) {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('Location permission denied');
  return ExpoLocation.watchPositionAsync(
    { accuracy: ExpoLocation.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
    (loc) => callback({ lat: loc.coords.latitude, lng: loc.coords.longitude })
  );
}

// locationService.js — GPS and distance calculation utilities.
// Wraps expo-location (the library that accesses the phone's GPS).

// We import everything from expo-location under the alias "ExpoLocation"
// so it's clear where each function comes from.
import * as ExpoLocation from 'expo-location';

// ─── requestLocationPermission ────────────────────────────────────────────────
// Asks the user to allow the app to access their GPS.
// "Foreground" permission = only while the app is open (not in background).
// Returns true if the user said yes, false if they said no.
export async function requestLocationPermission() {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// ─── getCurrentLocation ───────────────────────────────────────────────────────
// Gets the phone's current GPS coordinates as { lat, lng }.
// Throws an error if permission was denied.
// Used when a customer submits a service request (to record where they are).
export async function getCurrentLocation() {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('Location permission denied');

  // Accuracy.High uses GPS satellites for the most precise reading.
  // This may take a second or two on first call while the phone acquires signal.
  const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });

  // loc.coords contains latitude, longitude, altitude, speed, etc.
  // We only need lat/lng, so we return a simpler object.
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

// ─── haversineDistance ────────────────────────────────────────────────────────
// Calculates the straight-line distance between two GPS coordinates in miles.
// "Haversine" is the mathematical formula for great-circle distance on a sphere.
//
// coord1, coord2 — objects with { lat, lng } properties
// Returns distance in miles (as a decimal, e.g. 3.7)
export function haversineDistance(coord1, coord2) {
  const R = 3958.8; // Earth's radius in miles (use 6371 for kilometers)

  // Convert the difference in degrees to radians before doing trig math
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  // The Haversine formula — each part calculates a component of the arc
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;

  // atan2 gives the angular distance; multiply by diameter (2R) to get miles
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: converts degrees to radians (trig functions in JS use radians)
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// ─── watchPosition ────────────────────────────────────────────────────────────
// Continuously tracks the device's GPS position and calls `callback` with
// { lat, lng } every time it updates.
//
// Used in two places:
//   1. MechanicHomeScreen — updates mechanic's location in Firestore while online
//   2. ActiveJobScreen    — broadcasts mechanic position to the customer's map
//
// Returns an Expo subscription object. Call subscription.remove() to stop tracking.
// (We store this in a useRef so screens can clean up when they unmount.)
export async function watchPosition(callback) {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('Location permission denied');

  // timeInterval: fire callback at most every 10 seconds
  // distanceInterval: also fire if the device moves more than 10 meters
  // whichever threshold is hit first triggers the update
  return ExpoLocation.watchPositionAsync(
    { accuracy: ExpoLocation.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
    (loc) => callback({ lat: loc.coords.latitude, lng: loc.coords.longitude })
  );
}

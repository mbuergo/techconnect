// vehicleService.js — fetches vehicle data from the NHTSA vPIC API.
// NHTSA (National Highway Traffic Safety Administration) is a US government agency
// that provides a free, public API with data on every vehicle sold in the US.
// No API key is needed — it's completely free and open.
//
// The VehicleSetupScreen calls these four functions in sequence:
//   getYears() → getMakes(year) → getModels(make, year) → getTrims(make, year, model)
// Each result populates the next dropdown.

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// ─── getYears ─────────────────────────────────────────────────────────────────
// Returns an array of model years from 1990 to the current year, newest first.
// We generate this locally — no API call needed since years don't change.
export function getYears() {
  const current = new Date().getFullYear(); // e.g. 2026
  const years = [];
  for (let y = current; y >= 1990; y--) {
    years.push(String(y)); // Push as string to match how Picker expects values
  }
  return years; // e.g. ['2026', '2025', '2024', ... '1990']
}

// ─── getMakes ─────────────────────────────────────────────────────────────────
// Fetches all car makes (brands) available for a given model year.
// Example: getMakes('2022') → ['Acura', 'BMW', 'Chevrolet', 'Ford', ...]
export async function getMakes(year) {
  const url = `${BASE}/GetMakesForVehicleType/car?modelYear=${year}&format=json`;
  const res = await fetch(url); // fetch() is built into React Native — no import needed
  const json = await res.json(); // Parse the response body as JSON

  // json.Results is an array of objects. Each has a MakeName field.
  // .filter(Boolean) removes any null/undefined/empty values.
  // .sort() alphabetizes the list.
  return (json.Results || [])
    .map((r) => r.MakeName)
    .filter(Boolean)
    .sort();
}

// ─── getModels ────────────────────────────────────────────────────────────────
// Fetches all models for a specific make and year.
// Example: getModels('Toyota', '2022') → ['4Runner', 'Camry', 'Corolla', ...]
export async function getModels(make, year) {
  // encodeURIComponent handles makes with spaces like "Land Rover" → "Land%20Rover"
  const encodedMake = encodeURIComponent(make);
  const url = `${BASE}/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}?format=json`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.Results || [])
    .map((r) => r.Model_Name)
    .filter(Boolean)
    .sort();
}

// ─── getTrims ─────────────────────────────────────────────────────────────────
// Attempts to fetch trim/engine variants for a specific make, year, and model.
// The NHTSA API doesn't reliably return engine variants at this level,
// so we always fall back to a hardcoded list of common engine types.
export async function getTrims(make, year, model) {
  const encodedMake = encodeURIComponent(make);
  const url = `${BASE}/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}/vehicletype/car?format=json`;
  const res = await fetch(url);
  const json = await res.json();

  // Try to filter results to the selected model and extract unique names
  const results = (json.Results || []).filter(
    (r) => r.Model_Name && r.Model_Name.toLowerCase() === model.toLowerCase()
  );
  const trims = results.map((r) => r.Model_Name).filter(Boolean);

  // If the API returned distinct trim names, use them.
  // Otherwise use a practical list of engine types that mechanics need to know.
  const fallback = [
    '2.0L 4-Cylinder',
    '2.5L 4-Cylinder',
    '3.0L V6',
    '3.5L V6',
    '5.0L V8',
    'Electric',
    'Hybrid',
    'Turbocharged',
    'Other',
  ];
  // [...new Set(trims)] removes duplicates by converting to a Set and back to an array
  return trims.length > 0 ? [...new Set(trims)] : fallback;
}

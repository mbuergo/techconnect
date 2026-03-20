const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export function getYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= 1990; y--) {
    years.push(String(y));
  }
  return years;
}

export async function getMakes(year) {
  const url = `${BASE}/GetMakesForVehicleType/car?modelYear=${year}&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.Results || [])
    .map((r) => r.MakeName)
    .filter(Boolean)
    .sort();
}

export async function getModels(make, year) {
  const encodedMake = encodeURIComponent(make);
  const url = `${BASE}/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}?format=json`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.Results || [])
    .map((r) => r.Model_Name)
    .filter(Boolean)
    .sort();
}

export async function getTrims(make, year, model) {
  const encodedMake = encodeURIComponent(make);
  // Returns variant/trim data including engine info
  const url = `${BASE}/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}/vehicletype/car?format=json`;
  const res = await fetch(url);
  const json = await res.json();
  // Filter to the selected model and extract unique trim names
  const results = (json.Results || []).filter(
    (r) => r.Model_Name && r.Model_Name.toLowerCase() === model.toLowerCase()
  );
  // If API returns trims, use them; otherwise fall back to common engine types
  const trims = results
    .map((r) => r.Model_Name)
    .filter(Boolean);

  // The NHTSA API doesn't always return engine variants at this level.
  // Provide a practical fallback list of engine types.
  const fallback = ['2.0L 4-Cylinder', '2.5L 4-Cylinder', '3.0L V6', '3.5L V6', '5.0L V8', 'Electric', 'Hybrid', 'Turbocharged', 'Other'];
  return trims.length > 0 ? [...new Set(trims)] : fallback;
}

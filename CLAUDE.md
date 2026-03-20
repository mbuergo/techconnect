# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands must be run in a Windows Command Prompt or PowerShell (not the Claude bash shell, which lacks Node.js in its PATH):

```
npm install          # Install dependencies
npx expo start       # Start dev server + QR code for Expo Go
npx expo start --clear   # Start with cleared Metro cache (use when modules act stale)
```

There are no tests or linters configured yet.

## Architecture

TechConnect is a single-codebase Expo (React Native) app for iOS and Android. It has two completely separate user flows — **Customer** and **Mechanic** — determined at registration and stored in Firestore.

### Auth & routing flow

`App.js` listens to Firebase `onAuthStateChanged` and passes the user object to `AppNavigator`. The navigator fetches the user's `role` field from Firestore and renders one of three stack sets: unauthenticated (Login/Register), role unassigned (RoleSelect), or role-specific screens (Customer or Mechanic). Role is written once on `RoleSelectScreen` and never changes.

### Data layer

All Firebase interaction is isolated in `src/services/`. No screen touches Firestore or Firebase Auth directly — they call service functions. The one exception is `MechanicHomeScreen` and `VehicleSetupScreen`, which call `updateDoc`/`doc` directly for simple field updates where a service function would be overkill.

**Firestore collections:**
- `users/{uid}` — profile for both roles; mechanic-only fields (`isAvailable`, `location`, `bio`, `specialties`) and customer-only fields (`vehicles[]`) coexist on the same document
- `jobs/{jobId}` — full job lifecycle; `mechanicCurrentLocation` is updated every 10s by the mechanic's device while a job is active
- `ratings/{ratingId}` — written after job completion; `ratingService` also updates the denormalized `averageRating`/`totalRatings` on the rated user's document

### Real-time updates

Firestore `onSnapshot` listeners are used (not polling) in three places: `subscribeToJob` (both tracking screens), `subscribeToPendingJobs` (mechanic home), and `subscribeMechanicActiveJob` / `subscribeCustomerActiveJob`. All return unsubscribe functions that screens call in `useEffect` cleanup.

### Location

`locationService.js` wraps `expo-location`. `watchPosition` returns an Expo subscription object with a `.remove()` method. Screens store this in a `useRef` and call `watchRef.current?.remove?.()` on cleanup. Mechanic GPS is written to both `users/{uid}.location` (for the nearby-mechanics query) and `jobs/{jobId}.mechanicCurrentLocation` (for the customer's tracking map) on separate intervals.

### Vehicle selection

`VehicleSetupScreen` uses four cascading `@react-native-picker/picker` dropdowns. Each selection triggers a `useEffect` that calls the NHTSA vPIC API (`vehicleService.js`) and populates the next dropdown. Dropdowns are disabled (greyed out) until the prior selection is made. The NHTSA API does not return engine/trim variants reliably, so `getTrims()` always falls back to a hardcoded list of engine types.

### Firebase config

`src/config/firebase.js` exports `auth`, `db`, and `storage`. Auth uses `initializeAuth` with `getReactNativePersistence(AsyncStorage)` — this is required for session persistence on mobile and differs from the web Firebase snippet shown in the Firebase Console.

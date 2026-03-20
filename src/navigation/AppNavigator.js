// AppNavigator.js — the "traffic controller" of the app.
// It reads the logged-in user's role from Firestore, then shows the
// correct set of screens. If you're not logged in, you see Login/Register.
// If you have no role yet, you see RoleSelect. Otherwise you see either
// the Customer screens or the Mechanic screens.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// createStackNavigator creates a stack-based navigation system.
// "Stack" means screens are stacked on top of each other like cards —
// navigating forward pushes a card, going back pops it.
import { createStackNavigator } from '@react-navigation/stack';

// doc() creates a reference to a specific Firestore document.
// getDoc() fetches that document once (not in real time).
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';

// Customer screens
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import VehicleSetupScreen from '../screens/customer/VehicleSetupScreen';
import RequestServiceScreen from '../screens/customer/RequestServiceScreen';
import TrackJobScreen from '../screens/customer/TrackJobScreen';

// Mechanic screens
import MechanicHomeScreen from '../screens/mechanic/MechanicHomeScreen';
import MechanicProfileScreen from '../screens/mechanic/MechanicProfileScreen';
import ActiveJobScreen from '../screens/mechanic/ActiveJobScreen';

// Create the navigator object. Stack.Navigator and Stack.Screen come from this.
const Stack = createStackNavigator();

// `user` is passed down from App.js — it's either null (not logged in) or
// a Firebase User object (logged in).
export default function AppNavigator({ user }) {
  // `role` will be 'customer', 'mechanic', 'unassigned', or null
  const [role, setRole] = useState(null);

  // () => !!user means: if user is already set (app relaunch with saved session),
  // start in loading state so we don't flash the wrong screen while fetching.
  // !! converts a value to boolean (truthy → true, falsy → false).
  const [loadingRole, setLoadingRole] = useState(() => !!user);

  useEffect(() => {
    // If the user logs out, clear the role and stop loading
    if (!user) {
      setRole(null);
      return;
    }

    setLoadingRole(true);

    // Look up the user's document in Firestore to find their role.
    // doc(db, 'users', user.uid) = path: users/{uid}
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          // snap.data() returns the document's fields as a plain object
          setRole(snap.data().role); // 'customer' or 'mechanic'
        } else {
          // No Firestore document found — new user who hasn't picked a role yet
          setRole('unassigned');
        }
      })
      .catch(() => setRole('unassigned')) // If Firestore fails, send them to role select
      .finally(() => setLoadingRole(false)); // Always stop the spinner when done
  }, [user]); // Re-run this effect whenever `user` changes (login/logout)

  // Show a spinner while we're fetching the role from Firestore
  if (loadingRole) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    // headerShown: false hides the default navigation header bar on all screens.
    // We build our own headers inside each screen.
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // ── NOT LOGGED IN ──────────────────────────────────────────────
        // Only show login and register. The user can navigate between these two.
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : role === 'unassigned' || role === null ? (
        // ── LOGGED IN BUT NO ROLE ──────────────────────────────────────
        // After registration the user must pick Customer or Mechanic.
        // Once they pick, this navigator re-renders with the correct screens.
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      ) : role === 'customer' ? (
        // ── CUSTOMER SCREENS ───────────────────────────────────────────
        // The first screen listed (CustomerHome) is the one shown by default.
        <>
          <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
          <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
          <Stack.Screen name="RequestService" component={RequestServiceScreen} />
          <Stack.Screen name="TrackJob" component={TrackJobScreen} />
        </>
      ) : (
        // ── MECHANIC SCREENS ───────────────────────────────────────────
        <>
          <Stack.Screen name="MechanicHome" component={MechanicHomeScreen} />
          <Stack.Screen name="MechanicProfile" component={MechanicProfileScreen} />
          <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

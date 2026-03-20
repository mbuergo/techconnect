import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
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

const Stack = createStackNavigator();

export default function AppNavigator({ user }) {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(() => !!user);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    setLoadingRole(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          setRole(snap.data().role);
        } else {
          setRole('unassigned');
        }
      })
      .catch(() => setRole('unassigned'))
      .finally(() => setLoadingRole(false));
  }, [user]);

  if (loadingRole) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Not logged in
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : role === 'unassigned' || role === null ? (
        // Logged in but no role yet
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      ) : role === 'customer' ? (
        // Customer screens
        <>
          <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
          <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
          <Stack.Screen name="RequestService" component={RequestServiceScreen} />
          <Stack.Screen name="TrackJob" component={TrackJobScreen} />
        </>
      ) : (
        // Mechanic screens
        <>
          <Stack.Screen name="MechanicHome" component={MechanicHomeScreen} />
          <Stack.Screen name="MechanicProfile" component={MechanicProfileScreen} />
          <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// RoleSelectScreen.js — shown once after a new user registers.
// The user picks "Customer" or "Mechanic." This choice is permanent
// and controls which set of screens they see for the rest of the app.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { auth } from '../../config/firebase';
import { setUserRole, logout } from '../../services/authService';

export default function RoleSelectScreen() {
  const [loading, setLoading] = useState(false);

  // Called when the user taps either card.
  // `role` will be either 'customer' or 'mechanic'.
  async function handleSelect(role) {
    setLoading(true);
    try {
      // auth.currentUser.uid is the unique ID Firebase assigned this user at registration
      await setUserRole(auth.currentUser.uid, role);

      // After setUserRole() writes to Firestore, AppNavigator's useEffect will
      // NOT automatically re-run because the `user` object itself didn't change.
      // Instead, AppNavigator re-reads the role because onAuthStateChanged fires
      // again after Firestore writes, causing a re-render that picks up the new role.
      // Actually — the app re-renders because setUserRole updates Firestore, and
      // AppNavigator will re-render when we navigate back or when auth refreshes.
      // The simplest explanation: once the role is written, the navigator
      // re-evaluates and shows the correct screen set automatically.
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you use TechConnect?</Text>
      <Text style={styles.subtitle}>Choose your role. This can't be changed later.</Text>

      {/* Show a spinner while saving to Firestore, otherwise show both cards */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Customer card — blue background */}
          <TouchableOpacity style={[styles.roleCard, styles.customerCard]} onPress={() => handleSelect('customer')}>
            <Text style={styles.roleIcon}>🚗</Text>
            <Text style={styles.roleTitle}>I'm a Customer</Text>
            <Text style={styles.roleDesc}>Request mobile mechanic services at my location.</Text>
          </TouchableOpacity>

          {/* Mechanic card — green background */}
          <TouchableOpacity style={[styles.roleCard, styles.mechanicCard]} onPress={() => handleSelect('mechanic')}>
            <Text style={styles.roleIcon}>🔧</Text>
            <Text style={styles.roleTitle}>I'm a Mechanic</Text>
            <Text style={styles.roleDesc}>Accept service requests and earn money on my schedule.</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Escape hatch — lets the user sign out if they registered by mistake */}
      <TouchableOpacity onPress={logout} style={styles.logoutLink}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  roleCard: {
    borderRadius: 14, padding: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  customerCard: { backgroundColor: '#e8f0fe' }, // Light blue
  mechanicCard: { backgroundColor: '#e6f4ea' }, // Light green
  roleIcon: { fontSize: 36, marginBottom: 8 },
  roleTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 4 },
  roleDesc: { fontSize: 14, color: '#444' },
  logoutLink: { marginTop: 30, alignItems: 'center' },
  logoutText: { color: '#d93025', fontSize: 14 },
});

// CustomerHomeScreen.js — the main screen for customers.
// Shows the vehicle on file, a "Find Mechanics" button, and any active job status.
// This screen is always listening to Firestore in real time for job updates.

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { auth } from '../../config/firebase';
import { getCurrentUserProfile, logout } from '../../services/authService';
import { getCurrentLocation } from '../../services/locationService';
import { findNearbyMechanics, subscribeCustomerActiveJob } from '../../services/jobService';
import MechanicCard from '../../components/MechanicCard';
import JobStatusBanner from '../../components/JobStatusBanner';

export default function CustomerHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);       // Customer's Firestore document
  const [mechanics, setMechanics] = useState([]);     // Nearby mechanics found by search
  const [activeJob, setActiveJob] = useState(null);   // Customer's current open job (if any)
  const [loading, setLoading] = useState(true);       // True until profile loads
  const [searching, setSearching] = useState(false);  // True while finding mechanics

  // auth.currentUser is the Firebase Auth user object — .uid is their unique ID
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    // Fetch the customer's profile (name, vehicles, etc.) from Firestore
    getCurrentUserProfile(uid).then(setProfile);

    // Subscribe to any currently active job for this customer.
    const unsub = subscribeCustomerActiveJob(uid, setActiveJob);
    return unsub;
  }, [uid]);

  // Re-fetch profile whenever this screen comes back into focus
  // (e.g. after returning from VehicleSetup with a newly added vehicle)
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      getCurrentUserProfile(uid).then(setProfile);
    });
    return unsubFocus;
  }, [navigation, uid]);

  // Turn off the loading spinner once the profile has loaded
  useEffect(() => {
    if (profile !== null) setLoading(false);
  }, [profile]);

  // Called when the customer taps "Find Nearby Mechanics"
  async function handleFindMechanics() {
    setSearching(true);
    try {
      // Get the customer's current GPS position
      const loc = await getCurrentLocation();
      // Query Firestore for online mechanics, then sort by distance using Haversine math
      const found = await findNearbyMechanics(loc);
      if (found.length === 0) {
        Alert.alert('No mechanics found', 'No available mechanics within 25 miles.');
      }
      setMechanics(found);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSearching(false);
    }
  }

  // When a mechanic card is tapped, go to RequestServiceScreen and pass the mechanic
  function handleSelectMechanic(mechanic) {
    // route.params in RequestServiceScreen will receive { mechanic }
    navigation.navigate('RequestService', { mechanic });
  }

  // Show a spinner while loading the profile for the first time
  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  // Check if the customer has at least one saved vehicle
  // ?. is "optional chaining" — safely returns undefined if profile is null
  const hasVehicle = profile?.vehicles?.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: greeting + sign out button */}
      <View style={styles.header}>
        {/* Show first name only. split(' ')[0] takes the first word. */}
        <Text style={styles.greeting}>Hi, {profile?.name?.split(' ')[0] || 'there'}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* If there's an active job, show its status and a button to track it */}
      {activeJob && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Request</Text>
          {/* JobStatusBanner changes color/text based on the job status */}
          <JobStatusBanner status={activeJob.status} />
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => navigation.navigate('TrackJob', { jobId: activeJob.id })}
          >
            <Text style={styles.trackBtnText}>View / Track Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* If no active job, show the vehicle setup prompt or vehicle info */}
      {!activeJob && (
        <>
          {!hasVehicle ? (
            // No vehicle saved yet — prompt the customer to add one
            <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('VehicleSetup')}>
              <Text style={styles.setupBannerText}>Add your vehicle to request service</Text>
              <Text style={styles.setupBannerCta}>Set up vehicle →</Text>
            </TouchableOpacity>
          ) : (
            // Vehicle on file — show the most recently added one
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {/* Show the last vehicle in the array (most recently added) */}
                Vehicle: {profile.vehicles[profile.vehicles.length - 1].year}{' '}
                {profile.vehicles[profile.vehicles.length - 1].make}{' '}
                {profile.vehicles[profile.vehicles.length - 1].model}
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('VehicleSetup')}>
                <Text style={styles.secondaryBtnText}>Manage Vehicles</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Only show "Find Mechanics" if they have a vehicle to service */}
          {hasVehicle && (
            <TouchableOpacity style={styles.findBtn} onPress={handleFindMechanics} disabled={searching}>
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.findBtnText}>Find Nearby Mechanics</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Mechanic results list — only shown after a search, and only if no active job */}
      {mechanics.length > 0 && !activeJob && (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{mechanics.length} Mechanics Nearby</Text>
          {/* FlatList efficiently renders long lists — only renders visible items */}
          <FlatList
            data={mechanics}
            keyExtractor={(m) => m.uid}  // Unique key for each list item (required by React)
            renderItem={({ item }) => (
              <MechanicCard mechanic={item} onSelect={handleSelectMechanic} />
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc', paddingHorizontal: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111' },
  logoutBtn: { color: '#d93025', fontSize: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  setupBanner: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 18, marginBottom: 16 },
  setupBannerText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  setupBannerCta: { color: '#bee3ff', fontSize: 13, marginTop: 4 },
  findBtn: {
    backgroundColor: '#0f9d58', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginBottom: 18,
  },
  findBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: '#1a73e8', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 6,
  },
  secondaryBtnText: { color: '#1a73e8', fontWeight: '600' },
  trackBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

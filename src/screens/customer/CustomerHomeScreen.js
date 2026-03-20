import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { auth } from '../../config/firebase';
import { getCurrentUserProfile } from '../../services/authService';
import { logout } from '../../services/authService';
import { getCurrentLocation } from '../../services/locationService';
import { findNearbyMechanics, subscribeCustomerActiveJob, createJob } from '../../services/jobService';
import MechanicCard from '../../components/MechanicCard';
import JobStatusBanner from '../../components/JobStatusBanner';

export default function CustomerHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    getCurrentUserProfile(uid).then(setProfile);
    // Subscribe to any active job
    const unsub = subscribeCustomerActiveJob(uid, setActiveJob);
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (profile !== null) setLoading(false);
  }, [profile]);

  async function handleFindMechanics() {
    setSearching(true);
    try {
      const loc = await getCurrentLocation();
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

  function handleSelectMechanic(mechanic) {
    navigation.navigate('RequestService', { mechanic });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  const hasVehicle = profile?.vehicles?.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name?.split(' ')[0] || 'there'}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {activeJob && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Request</Text>
          <JobStatusBanner status={activeJob.status} />
          <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('TrackJob', { jobId: activeJob.id })}>
            <Text style={styles.trackBtnText}>View / Track Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {!activeJob && (
        <>
          {!hasVehicle ? (
            <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('VehicleSetup')}>
              <Text style={styles.setupBannerText}>Add your vehicle to request service</Text>
              <Text style={styles.setupBannerCta}>Set up vehicle →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Vehicle: {profile.vehicles[profile.vehicles.length - 1].year}{' '}
                {profile.vehicles[profile.vehicles.length - 1].make}{' '}
                {profile.vehicles[profile.vehicles.length - 1].model}
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('VehicleSetup')}>
                <Text style={styles.secondaryBtnText}>Manage Vehicles</Text>
              </TouchableOpacity>
            </View>
          )}

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

      {mechanics.length > 0 && !activeJob && (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{mechanics.length} Mechanics Nearby</Text>
          <FlatList
            data={mechanics}
            keyExtractor={(m) => m.uid}
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
  setupBanner: {
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 18, marginBottom: 16,
  },
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

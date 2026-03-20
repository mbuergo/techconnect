import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { auth } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getCurrentUserProfile, logout } from '../../services/authService';
import { watchPosition } from '../../services/locationService';
import {
  subscribeToPendingJobs,
  subscribeMechanicActiveJob,
  acceptJob,
} from '../../services/jobService';
import { haversineDistance as calcDist } from '../../services/locationService';
import JobStatusBanner from '../../components/JobStatusBanner';

export default function MechanicHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const watchRef = useRef(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    getCurrentUserProfile(uid).then((p) => {
      setProfile(p);
      setIsAvailable(p?.isAvailable || false);
      setCurrentLocation(p?.location || null);
      setLoading(false);
    });

    const unsubPending = subscribeToPendingJobs(setPendingJobs);
    const unsubActive = subscribeMechanicActiveJob(uid, setActiveJob);
    return () => { unsubPending(); unsubActive(); };
  }, [uid]);

  // Start/stop GPS watching based on availability
  useEffect(() => {
    if (isAvailable) {
      watchPosition((loc) => {
        setCurrentLocation(loc);
        updateDoc(doc(db, 'users', uid), { location: loc }).catch(() => {});
      })
        .then((sub) => { watchRef.current = sub; })
        .catch(() => Alert.alert('Location Error', 'Could not access location. Enable GPS and try again.'));
    } else {
      watchRef.current?.remove?.();
      watchRef.current = null;
    }
    return () => watchRef.current?.remove?.();
  }, [isAvailable]);

  async function toggleAvailability(value) {
    setIsAvailable(value);
    await updateDoc(doc(db, 'users', uid), { isAvailable: value });
  }

  async function handleAccept(job) {
    Alert.alert(
      'Accept Job?',
      `Vehicle: ${job.vehicleInfo?.year} ${job.vehicleInfo?.make} ${job.vehicleInfo?.model}\nIssue: ${job.issueDescription}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptJob(job.id, uid);
              navigation.navigate('ActiveJob', { jobId: job.id });
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  const jobsWithDistance = pendingJobs.map((j) => ({
    ...j,
    distance: currentLocation && j.customerLocation
      ? calcDist(currentLocation, j.customerLocation)
      : null,
  })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name?.split(' ')[0]}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.availabilityRow}>
        <Text style={styles.availabilityLabel}>
          {isAvailable ? 'You are Online' : 'You are Offline'}
        </Text>
        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#ddd', true: '#0f9d58' }}
          thumbColor={isAvailable ? '#fff' : '#bbb'}
        />
      </View>

      <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('MechanicProfile')}>
        <Text style={styles.profileBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      {activeJob && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Job</Text>
          <JobStatusBanner status={activeJob.status} />
          <TouchableOpacity
            style={styles.activeJobBtn}
            onPress={() => navigation.navigate('ActiveJob', { jobId: activeJob.id })}
          >
            <Text style={styles.activeJobBtnText}>Open Active Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {!activeJob && isAvailable && (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            {jobsWithDistance.length > 0 ? `${jobsWithDistance.length} Nearby Request(s)` : 'No pending requests nearby'}
          </Text>
          <FlatList
            data={jobsWithDistance}
            keyExtractor={(j) => j.id}
            renderItem={({ item }) => (
              <View style={styles.jobCard}>
                <Text style={styles.jobVehicle}>
                  {item.vehicleInfo?.year} {item.vehicleInfo?.make} {item.vehicleInfo?.model}
                </Text>
                <Text style={styles.jobIssue} numberOfLines={2}>{item.issueDescription}</Text>
                {item.distance !== null && (
                  <Text style={styles.jobDist}>{item.distance.toFixed(1)} miles away</Text>
                )}
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
                  <Text style={styles.acceptBtnText}>View & Accept</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}

      {!isAvailable && (
        <View style={styles.offlineMsg}>
          <Text style={styles.offlineMsgText}>Toggle Online to start receiving job requests.</Text>
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
  availabilityRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07,
    shadowRadius: 4, elevation: 2,
  },
  availabilityLabel: { fontSize: 16, fontWeight: '600', color: '#111' },
  profileBtn: {
    borderWidth: 1.5, borderColor: '#1a73e8', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginBottom: 16,
  },
  profileBtnText: { color: '#1a73e8', fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  activeJobBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginTop: 4,
  },
  activeJobBtnText: { color: '#fff', fontWeight: '700' },
  jobCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  jobVehicle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  jobIssue: { fontSize: 13, color: '#555', marginBottom: 6 },
  jobDist: { fontSize: 12, color: '#1a73e8', fontWeight: '600', marginBottom: 8 },
  acceptBtn: {
    backgroundColor: '#0f9d58', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '700' },
  offlineMsg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineMsgText: { color: '#888', fontSize: 15, textAlign: 'center' },
});

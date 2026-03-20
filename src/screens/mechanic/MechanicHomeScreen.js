// MechanicHomeScreen.js — the mechanic's dashboard.
// Contains an Online/Offline toggle, a live list of pending job requests,
// and an "Active Job" banner if the mechanic is currently on a job.
// When online, the mechanic's GPS is tracked and written to Firestore
// so customers can find them.

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { auth } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getCurrentUserProfile, logout } from '../../services/authService';
import { watchPosition, haversineDistance as calcDist } from '../../services/locationService';
import {
  subscribeToPendingJobs,
  subscribeMechanicActiveJob,
  acceptJob,
} from '../../services/jobService';
import JobStatusBanner from '../../components/JobStatusBanner';

export default function MechanicHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);  // Online/Offline toggle state
  const [pendingJobs, setPendingJobs] = useState([]);      // All open requests from Firestore
  const [activeJob, setActiveJob] = useState(null);        // The mechanic's current job (if any)
  const [currentLocation, setCurrentLocation] = useState(null); // Mechanic's last known GPS
  const [loading, setLoading] = useState(true);

  // useRef holds a value that persists across re-renders without causing a re-render.
  // We use it to store the GPS subscription so we can cancel it later.
  // (useState would re-render the screen every time we set it, which we don't want.)
  const watchRef = useRef(null);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    // Load profile and set up real-time listeners when the screen first opens
    getCurrentUserProfile(uid).then((p) => {
      setProfile(p);
      setIsAvailable(p?.isAvailable || false);
      setCurrentLocation(p?.location || null);
      setLoading(false);
    });

    // Listen for all pending (unaccepted) job requests
    const unsubPending = subscribeToPendingJobs(setPendingJobs);
    // Listen for any job this mechanic has already accepted
    const unsubActive = subscribeMechanicActiveJob(uid, setActiveJob);

    // Cleanup both listeners when the screen unmounts
    return () => { unsubPending(); unsubActive(); };
  }, [uid]);

  // This effect starts or stops GPS tracking based on the availability toggle
  useEffect(() => {
    if (isAvailable) {
      // Start watching GPS — the callback fires every 10 seconds or 10 meters of movement
      watchPosition((loc) => {
        setCurrentLocation(loc); // Update local state for distance calculations
        // Write the new position to Firestore so customers can see this mechanic in search results
        updateDoc(doc(db, 'users', uid), { location: loc }).catch(() => {});
      })
        .then((sub) => { watchRef.current = sub; }) // Save the subscription for cleanup
        .catch(() => Alert.alert('Location Error', 'Could not access location. Enable GPS and try again.'));
    } else {
      // Stop tracking when going offline
      watchRef.current?.remove?.(); // .remove() cancels the Expo location subscription
      watchRef.current = null;
    }
    // Cleanup: stop GPS if the component unmounts while online
    return () => watchRef.current?.remove?.();
  }, [isAvailable]); // Re-run whenever the toggle changes

  async function toggleAvailability(value) {
    setIsAvailable(value);
    // Also persist the availability in Firestore so the customer search query finds them
    await updateDoc(doc(db, 'users', uid), { isAvailable: value });
  }

  // Called when the mechanic taps "View & Accept" on a job card
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
              // Mark the job as accepted and assign this mechanic's ID to it
              await acceptJob(job.id, uid);
              // Navigate to ActiveJobScreen to start working the job
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

  // Add calculated distance to each pending job so we can sort and display it
  const jobsWithDistance = pendingJobs.map((j) => ({
    ...j,
    distance: currentLocation && j.customerLocation
      ? calcDist(currentLocation, j.customerLocation) // Haversine math
      : null,
  })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999)); // Nearest first

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name?.split(' ')[0]}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Online / Offline toggle */}
      <View style={styles.availabilityRow}>
        <Text style={styles.availabilityLabel}>
          {isAvailable ? 'You are Online' : 'You are Offline'}
        </Text>
        {/* Switch is the native iOS/Android toggle component */}
        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#ddd', true: '#0f9d58' }} // Gray when off, green when on
          thumbColor={isAvailable ? '#fff' : '#bbb'}
        />
      </View>

      {/* Link to edit the mechanic's public profile */}
      <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('MechanicProfile')}>
        <Text style={styles.profileBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* If the mechanic has an active job, show status and a button to return to it */}
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

      {/* Pending jobs list — only shown when online and no active job */}
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

      {/* Offline message */}
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

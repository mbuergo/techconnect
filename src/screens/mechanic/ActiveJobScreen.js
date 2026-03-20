// ActiveJobScreen.js — the mechanic's in-progress job screen.
// The mechanic uses buttons here to advance the job through each status step.
// GPS is tracked continuously and broadcast to the customer's map while the job is active.
// After marking the job complete, the mechanic rates the customer.

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { auth } from '../../config/firebase';
import {
  subscribeToJob,
  updateJobStatus,
  updateMechanicLocationOnJob,
  JOB_STATUS,
} from '../../services/jobService';
import { watchPosition } from '../../services/locationService';
import { getCurrentUserProfile } from '../../services/authService';
import { submitRating } from '../../services/ratingService';
import JobStatusBanner from '../../components/JobStatusBanner';
import StarRating from '../../components/StarRating';

// The complete sequence of statuses a job moves through.
// The mechanic's button always advances to the NEXT status in this array.
const STATUS_FLOW = [
  JOB_STATUS.ACCEPTED,
  JOB_STATUS.EN_ROUTE,
  JOB_STATUS.IN_PROGRESS,
  JOB_STATUS.COMPLETE,
];

// Maps each status to the label for the "advance" button.
// COMPLETE has no label because the job is done — no more advancing.
const NEXT_LABEL = {
  [JOB_STATUS.ACCEPTED]:    'Start Driving (En Route)',
  [JOB_STATUS.EN_ROUTE]:    'Arrived — Start Job',
  [JOB_STATUS.IN_PROGRESS]: 'Mark Job Complete',
};

export default function ActiveJobScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null); // Customer's name
  const [stars, setStars] = useState(0);
  const [rated, setRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const watchRef = useRef(null); // Holds the GPS subscription object
  const uid = auth.currentUser?.uid;

  // Subscribe to live job updates — status changes from this screen update the customer's screen
  useEffect(() => {
    const unsub = subscribeToJob(jobId, setJob);
    return unsub;
  }, [jobId]);

  // Fetch the customer's profile once their ID is available
  useEffect(() => {
    if (job?.customerId && !customerProfile) {
      getCurrentUserProfile(job.customerId).then(setCustomerProfile);
    }
  }, [job?.customerId]);

  // Manage GPS tracking based on job status.
  // Start watching when the job is active, stop when it's complete.
  useEffect(() => {
    if (!job || job.status === JOB_STATUS.COMPLETE) {
      // Job is done — stop broadcasting GPS
      watchRef.current?.remove?.();
      watchRef.current = null;
      return;
    }

    if (!watchRef.current) {
      // Start GPS — every 10 seconds, write the mechanic's position to the job document.
      // The customer's TrackJobScreen receives this via its onSnapshot listener and
      // moves the green pin on their map.
      watchPosition((loc) =>
        updateMechanicLocationOnJob(jobId, loc).catch(() => {})
      )
        .then((sub) => { watchRef.current = sub; })
        .catch(() => {}); // Silently fail if GPS is unavailable
    }

    // Stop GPS if the screen unmounts (e.g. navigating away)
    return () => { watchRef.current?.remove?.(); watchRef.current = null; };
  }, [job?.status]); // Re-evaluate whenever the status changes

  // Advance the job to the next status in STATUS_FLOW
  async function handleNextStatus() {
    const currentIdx = STATUS_FLOW.indexOf(job.status);
    // Guard: don't go past the end of the array
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    setUpdatingStatus(true);
    try {
      await updateJobStatus(jobId, nextStatus);
      // The Firestore listener (subscribeToJob above) will receive the update
      // and re-render the screen automatically — we don't need to manually update state.
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Submit a star rating for the customer and return to the home screen
  async function handleRateCustomer() {
    if (stars === 0) {
      Alert.alert('Rate the customer', 'Please select a star rating.');
      return;
    }
    setSubmittingRating(true);
    try {
      await submitRating({
        jobId,
        fromUserId: uid,
        toUserId: job.customerId, // The person being rated is the customer
        stars,
      });
      setRated(true);
      Alert.alert('Thanks!', 'Rating submitted.', [
        { text: 'OK', onPress: () => navigation.navigate('MechanicHome') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (!job) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  // Convert stored { lat, lng } to the { latitude, longitude } format MapView expects
  const customerCoord = job.customerLocation
    ? { latitude: job.customerLocation.lat, longitude: job.customerLocation.lng }
    : null;

  const isComplete = job.status === JOB_STATUS.COMPLETE;
  const nextLabel = NEXT_LABEL[job.status]; // Will be undefined if job is complete

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Active Job</Text>
        <JobStatusBanner status={job.status} />

        {/* Job details card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Customer & Vehicle</Text>
          {customerProfile && <Text style={styles.detail}>Customer: {customerProfile.name}</Text>}
          <Text style={styles.detail}>
            Vehicle: {job.vehicleInfo?.year} {job.vehicleInfo?.make} {job.vehicleInfo?.model} ({job.vehicleInfo?.trim})
          </Text>
          <Text style={styles.detail}>Issue: {job.issueDescription}</Text>
        </View>

        {/* Map showing the customer's location so the mechanic knows where to drive */}
        {customerCoord && (
          <MapView
            style={styles.map}
            region={{
              latitude: customerCoord.latitude,
              longitude: customerCoord.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={customerCoord} title="Customer Location" pinColor="blue" />
          </MapView>
        )}

        {/* "Next step" button — only shown while the job isn't complete */}
        {!isComplete && nextLabel && (
          <TouchableOpacity
            style={[styles.nextBtn, updatingStatus && styles.disabled]}
            onPress={handleNextStatus}
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>{nextLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Rating form — shown after job is complete and before rating is submitted */}
        {isComplete && !rated && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate the customer</Text>
            <StarRating rating={stars} onRate={setStars} size={38} />
            <TouchableOpacity
              style={[styles.rateBtn, submittingRating && styles.disabled]}
              onPress={handleRateCustomer}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.rateBtnText}>Submit & Finish</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* After rating submitted, go back home */}
        {isComplete && rated && (
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('MechanicHome')}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  inner: { paddingHorizontal: 18, paddingVertical: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4 },
  detailsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2, marginBottom: 14,
  },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#111', marginBottom: 8 },
  detail: { fontSize: 14, color: '#444', marginBottom: 3 },
  map: { height: 200, borderRadius: 12, marginBottom: 14 },
  nextBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginBottom: 14,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  ratingTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },
  rateBtn: {
    backgroundColor: '#0f9d58', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 28, marginTop: 16,
  },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  homeBtn: {
    backgroundColor: '#0f9d58', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

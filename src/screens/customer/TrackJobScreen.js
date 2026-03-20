// TrackJobScreen.js — the customer's live job tracking screen.
// Shows a map with the customer's pin and the mechanic's moving pin,
// a colored status banner, job details, and a rating form when the job completes.
// Everything updates in real time via a Firestore listener — no refresh needed.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
// MapView renders an interactive map. Marker = a pin. Polyline = a line between points.
import MapView, { Marker, Polyline } from 'react-native-maps';
import { auth } from '../../config/firebase';
import { subscribeToJob, JOB_STATUS } from '../../services/jobService';
import { getCurrentUserProfile } from '../../services/authService';
import { submitRating } from '../../services/ratingService';
import JobStatusBanner from '../../components/JobStatusBanner';
import StarRating from '../../components/StarRating';

export default function TrackJobScreen({ route, navigation }) {
  // `jobId` was passed here via navigation.navigate('TrackJob', { jobId })
  const { jobId } = route.params;

  const [job, setJob] = useState(null);                     // Live job data from Firestore
  const [mechanicProfile, setMechanicProfile] = useState(null); // Mechanic's name/info
  const [stars, setStars] = useState(0);                    // Selected rating (1–5)
  const [rated, setRated] = useState(false);                // True after rating is submitted
  const [submittingRating, setSubmittingRating] = useState(false);
  const uid = auth.currentUser?.uid;

  // Subscribe to this job document in real time.
  // Whenever the mechanic updates the status or their location, `setJob` fires
  // and the screen automatically re-renders with fresh data.
  useEffect(() => {
    const unsub = subscribeToJob(jobId, setJob);
    return unsub; // Unsubscribe when the customer leaves this screen
  }, [jobId]);

  // Once we know the mechanic's ID (after they accept), fetch their profile once.
  // !mechanicProfile prevents fetching multiple times if job updates keep arriving.
  useEffect(() => {
    if (job?.mechanicId && !mechanicProfile) {
      getCurrentUserProfile(job.mechanicId).then(setMechanicProfile);
    }
  }, [job?.mechanicId]);

  async function handleRateAndClose() {
    if (stars === 0) {
      Alert.alert('Rate your mechanic', 'Please select a star rating before submitting.');
      return;
    }
    setSubmittingRating(true);
    try {
      await submitRating({
        jobId,
        fromUserId: uid,
        toUserId: job.mechanicId,
        stars,
      });
      setRated(true);
      Alert.alert('Thanks!', 'Your rating has been submitted.', [
        { text: 'OK', onPress: () => navigation.navigate('CustomerHome') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  // Show a spinner until the first Firestore snapshot arrives
  if (!job) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  // MapView needs a `region` object to set the initial view.
  // We center on the customer's location with a zoom level set by latitudeDelta/longitudeDelta.
  // Smaller delta = more zoomed in. 0.05 is roughly city-block level.
  const customerRegion = job.customerLocation
    ? {
        latitude: job.customerLocation.lat,
        longitude: job.customerLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : null;

  // Marker coordinates use { latitude, longitude } (MapView convention)
  // while our stored data uses { lat, lng } — we convert here
  const mechanicCoord = job.mechanicCurrentLocation
    ? { latitude: job.mechanicCurrentLocation.lat, longitude: job.mechanicCurrentLocation.lng }
    : null;

  const customerCoord = job.customerLocation
    ? { latitude: job.customerLocation.lat, longitude: job.customerLocation.lng }
    : null;

  const isComplete = job.status === JOB_STATUS.COMPLETE;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Track Your Job</Text>

        {/* Colored banner showing the current status */}
        <JobStatusBanner status={job.status} />

        {/* Map — only shown if we have the customer's location */}
        {customerRegion && (
          <MapView style={styles.map} region={customerRegion}>
            {/* Blue pin = customer's location */}
            {customerCoord && (
              <Marker coordinate={customerCoord} title="Your Location" pinColor="blue" />
            )}
            {/* Green pin = mechanic's current location (updates every 10 seconds) */}
            {mechanicCoord && (
              <Marker coordinate={mechanicCoord} title={mechanicProfile?.name || 'Mechanic'} pinColor="green" />
            )}
            {/* Blue line connecting mechanic to customer while en route */}
            {mechanicCoord && customerCoord && (
              <Polyline
                coordinates={[mechanicCoord, customerCoord]}
                strokeColor="#1a73e8"
                strokeWidth={3}
              />
            )}
          </MapView>
        )}

        {/* Job details card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Job Details</Text>
          <Text style={styles.detailRow}>
            <Text style={styles.detailKey}>Vehicle: </Text>
            {job.vehicleInfo?.year} {job.vehicleInfo?.make} {job.vehicleInfo?.model} ({job.vehicleInfo?.trim})
          </Text>
          <Text style={styles.detailRow}>
            <Text style={styles.detailKey}>Issue: </Text>
            {job.issueDescription}
          </Text>
          {mechanicProfile && (
            <Text style={styles.detailRow}>
              <Text style={styles.detailKey}>Mechanic: </Text>
              {mechanicProfile.name}
            </Text>
          )}
        </View>

        {/* Rating form — shown only when the job is complete and not yet rated */}
        {isComplete && !rated && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate your mechanic</Text>
            {/* Interactive stars — onRate updates the `stars` state */}
            <StarRating rating={stars} onRate={setStars} size={38} />
            <TouchableOpacity
              style={[styles.rateBtn, submittingRating && styles.disabled]}
              onPress={handleRateAndClose}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.rateBtnText}>Submit Rating & Close</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* After rating is submitted, show a simple "go home" button */}
        {isComplete && rated && (
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('CustomerHome')}>
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
  map: { height: 220, borderRadius: 12, marginVertical: 14 },
  detailsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2, marginBottom: 16,
  },
  detailsTitle: { fontWeight: '700', fontSize: 15, color: '#111', marginBottom: 8 },
  detailRow: { fontSize: 14, color: '#444', marginBottom: 4 },
  detailKey: { fontWeight: '600', color: '#111' },
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2, marginBottom: 16,
  },
  ratingTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },
  rateBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 28, marginTop: 16,
  },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  homeBtn: {
    backgroundColor: '#0f9d58', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

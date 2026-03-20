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

const STATUS_FLOW = [
  JOB_STATUS.ACCEPTED,
  JOB_STATUS.EN_ROUTE,
  JOB_STATUS.IN_PROGRESS,
  JOB_STATUS.COMPLETE,
];

const NEXT_LABEL = {
  [JOB_STATUS.ACCEPTED]: 'Start Driving (En Route)',
  [JOB_STATUS.EN_ROUTE]: 'Arrived — Start Job',
  [JOB_STATUS.IN_PROGRESS]: 'Mark Job Complete',
};

export default function ActiveJobScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [stars, setStars] = useState(0);
  const [rated, setRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const watchRef = useRef(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    const unsub = subscribeToJob(jobId, setJob);
    return unsub;
  }, [jobId]);

  useEffect(() => {
    if (job?.customerId && !customerProfile) {
      getCurrentUserProfile(job.customerId).then(setCustomerProfile);
    }
  }, [job?.customerId]);

  // Watch and broadcast mechanic GPS while job is active (not complete)
  useEffect(() => {
    if (!job || job.status === JOB_STATUS.COMPLETE) {
      watchRef.current?.remove?.();
      watchRef.current = null;
      return;
    }
    if (!watchRef.current) {
      watchPosition((loc) => updateMechanicLocationOnJob(jobId, loc).catch(() => {}))
        .then((sub) => { watchRef.current = sub; })
        .catch(() => {});
    }
    return () => { watchRef.current?.remove?.(); watchRef.current = null; };
  }, [job?.status]);

  async function handleNextStatus() {
    const currentIdx = STATUS_FLOW.indexOf(job.status);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    setUpdatingStatus(true);
    try {
      await updateJobStatus(jobId, nextStatus);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

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
        toUserId: job.customerId,
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

  const customerCoord = job.customerLocation
    ? { latitude: job.customerLocation.lat, longitude: job.customerLocation.lng }
    : null;

  const isComplete = job.status === JOB_STATUS.COMPLETE;
  const nextLabel = NEXT_LABEL[job.status];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Active Job</Text>
        <JobStatusBanner status={job.status} />

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Customer & Vehicle</Text>
          {customerProfile && <Text style={styles.detail}>Customer: {customerProfile.name}</Text>}
          <Text style={styles.detail}>
            Vehicle: {job.vehicleInfo?.year} {job.vehicleInfo?.make} {job.vehicleInfo?.model} ({job.vehicleInfo?.trim})
          </Text>
          <Text style={styles.detail}>Issue: {job.issueDescription}</Text>
        </View>

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
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    alignItems: 'center',
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

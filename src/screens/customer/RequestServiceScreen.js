// RequestServiceScreen.js — the form where a customer describes their issue
// and submits a service request. Called after selecting a mechanic from the list.
// Captures GPS location at the moment of submission so the mechanic knows where to go.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../../config/firebase';
import { getCurrentUserProfile } from '../../services/authService';
import { getCurrentLocation } from '../../services/locationService';
import { createJob } from '../../services/jobService';

export default function RequestServiceScreen({ navigation, route }) {
  // `route.params` contains anything passed via navigation.navigate('RequestService', {...})
  // In this case, the selected mechanic is passed from CustomerHomeScreen.
  // The || {} fallback prevents a crash if params is undefined.
  const { mechanic } = route.params || {};

  const [profile, setProfile] = useState(null);
  // Track which vehicle the customer wants serviced (index into their vehicles array)
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [issueDescription, setIssueDescription] = useState('');
  const [loading, setLoading] = useState(true);    // True while loading the profile
  const [submitting, setSubmitting] = useState(false); // True while creating the job

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    getCurrentUserProfile(uid).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [uid]);

  async function handleSubmit() {
    if (!issueDescription.trim()) {
      Alert.alert('Missing info', 'Please describe the issue with your vehicle.');
      return;
    }
    const vehicles = profile?.vehicles || [];
    if (vehicles.length === 0) {
      Alert.alert('No vehicle', 'Please add a vehicle first.');
      return;
    }

    setSubmitting(true);
    try {
      // Get the customer's current GPS coordinates right now (at submission time)
      const loc = await getCurrentLocation();

      // Get the vehicle the customer selected from the picker
      const vehicleInfo = vehicles[selectedVehicleIndex];

      // Create the job document in Firestore and get back its auto-generated ID
      const jobId = await createJob({
        customerId: uid,
        vehicleInfo,
        issueDescription: issueDescription.trim(),
        customerLocation: loc,               // { lat, lng } snapped at this moment
        preferredMechanicId: mechanic?.uid || null, // The mechanic they tapped on
      });

      // Navigate to the tracking screen and pass the new job's ID
      navigation.navigate('TrackJob', { jobId });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  const vehicles = profile?.vehicles || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Request Service</Text>

        {/* Show the mechanic's name if one was pre-selected from the list */}
        {mechanic && (
          <View style={styles.mechanicBadge}>
            <Text style={styles.mechanicBadgeText}>Requesting: {mechanic.name}</Text>
          </View>
        )}

        {/* Vehicle picker — lets the customer choose which of their vehicles needs service */}
        <Text style={styles.label}>Select Vehicle</Text>
        {vehicles.length === 0 ? (
          <Text style={styles.noVehicle}>No vehicles saved. Go back and add one first.</Text>
        ) : (
          <View style={styles.pickerWrapper}>
            {/* The value is the array index (0, 1, 2...) — we use index to look up the vehicle */}
            <Picker
              selectedValue={selectedVehicleIndex}
              onValueChange={(v) => setSelectedVehicleIndex(v)}
            >
              {vehicles.map((v, i) => (
                <Picker.Item key={i} value={i} label={`${v.year} ${v.make} ${v.model} (${v.trim})`} />
              ))}
            </Picker>
          </View>
        )}

        {/* Multi-line text input for describing the problem */}
        <Text style={styles.label}>Describe the Issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. My car won't start, I think it's the battery. It clicks when I turn the key..."
          placeholderTextColor="#aaa"
          value={issueDescription}
          onChangeText={setIssueDescription}
          multiline            // Allow multiple lines of text
          numberOfLines={5}    // Initial height (Android)
          textAlignVertical="top" // Android: start text at the top, not vertically centered
        />

        {/* Reminder that GPS will be captured on submit */}
        <View style={styles.locationNote}>
          <Text style={styles.locationNoteText}>
            Your current GPS location will be shared with the mechanic when you submit.
          </Text>
        </View>

        {/* Disable the button if submitting or if there are no vehicles */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || vehicles.length === 0) && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting || vehicles.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  inner: { paddingHorizontal: 20, paddingVertical: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 14 },
  mechanicBadge: { backgroundColor: '#e8f0fe', borderRadius: 8, padding: 10, marginBottom: 16 },
  mechanicBadgeText: { color: '#1a73e8', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  noVehicle: { color: '#d93025', fontSize: 14, marginBottom: 8 },
  pickerWrapper: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  textArea: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111', minHeight: 120,
  },
  locationNote: { backgroundColor: '#fff8ee', borderRadius: 8, padding: 10, marginTop: 14 },
  locationNoteText: { color: '#b06000', fontSize: 13 },
  submitBtn: {
    backgroundColor: '#0f9d58', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  backLink: { marginTop: 14, alignItems: 'center' },
  backLinkText: { color: '#888', fontSize: 14 },
});

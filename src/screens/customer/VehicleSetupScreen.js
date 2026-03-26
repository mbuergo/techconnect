// VehicleSetupScreen.js — cascading vehicle dropdowns powered by the NHTSA API.
// The user selects Year → Make → Model → Engine/Trim in order.
// Each selection triggers an API call that populates the next dropdown.
// The completed vehicle is saved to the customer's Firestore document.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
// Picker is the native dropdown/select component on iOS and Android
import { Picker } from '@react-native-picker/picker';
import { auth } from '../../config/firebase';
// Firestore functions for reading and writing
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getYears, getMakes, getModels, getTrims } from '../../services/vehicleService';

export default function VehicleSetupScreen({ navigation }) {
  // The four selected values — start empty until the user picks each one
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');

  // The list of options for each dropdown
  // `years` is generated locally (no API call), so we use useState with an initial value
  const [years] = useState(getYears()); // This never changes, so no setter needed
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  // Loading state for each dropdown while the API call is in flight
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vehicles already saved to this account — shown at the top of the screen
  const [savedVehicles, setSavedVehicles] = useState([]);

  // On first load, fetch the customer's saved vehicles from Firestore
  useEffect(() => {
    getDoc(doc(db, 'users', auth.currentUser.uid)).then((snap) => {
      if (snap.exists()) setSavedVehicles(snap.data().vehicles || []);
    });
  }, []); // Empty dependency array = run once when the screen loads

  // When year changes: reset all downstream dropdowns and fetch makes for this year
  useEffect(() => {
    if (!year) return; // Don't run on initial empty state
    // Reset downstream selections — picking a new year invalidates the old make/model/trim
    setMake(''); setModel(''); setTrim('');
    setMakes([]); setModels([]); setTrims([]);
    setLoadingMakes(true);
    getMakes(year)
      .then(setMakes)
      .catch(() => Alert.alert('Error', 'Could not load makes. Check your connection.'))
      .finally(() => setLoadingMakes(false));
  }, [year]); // This effect re-runs every time `year` changes

  // When make changes: reset model and trim, fetch models for this make+year
  useEffect(() => {
    if (!year || !make) return;
    setModel(''); setTrim('');
    setModels([]); setTrims([]);
    setLoadingModels(true);
    getModels(make, year)
      .then(setModels)
      .catch(() => Alert.alert('Error', 'Could not load models.'))
      .finally(() => setLoadingModels(false));
  }, [make]);

  // When model changes: reset trim and fetch engine/trim options
  useEffect(() => {
    if (!year || !make || !model) return;
    setTrim('');
    setTrims([]);
    setLoadingTrims(true);
    getTrims(make, year, model)
      .then(setTrims)
      .catch(() => Alert.alert('Error', 'Could not load trim/engine options.'))
      .finally(() => setLoadingTrims(false));
  }, [model]);

  async function handleSave() {
    if (!year || !make || !model || !trim) {
      Alert.alert('Incomplete', 'Please select Year, Make, Model, and Engine/Trim.');
      return;
    }
    setSaving(true);
    try {
      const vehicle = { year, make, model, trim };
      // arrayUnion adds `vehicle` to the vehicles array without duplicating it.
      // It's like "append to array" — and it's atomic (safe for concurrent writes).
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        vehicles: arrayUnion(vehicle),
      });
      Alert.alert('Vehicle saved!', `${year} ${make} ${model} (${trim}) has been added.`, [
        { text: 'OK', onPress: () => navigation.goBack() }, // Go back after the alert
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Vehicle Setup</Text>
        <Text style={styles.subtitle}>Select your vehicle details so mechanics know what to expect.</Text>

        {/* Show previously saved vehicles if any exist */}
        {savedVehicles.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved Vehicles</Text>
            {savedVehicles.map((v, i) => (
              <Text key={i} style={styles.savedItem}>
                {v.year} {v.make} {v.model} — {v.trim}
              </Text>
            ))}
          </View>
        )}

        {/* ── YEAR DROPDOWN ─────────────────────────────────────────── */}
        <Text style={styles.label}>Year</Text>
        <View style={styles.pickerWrapper}>
          {/* Picker.Item renders one option per year. key= is for React's internal tracking. */}
          <Picker selectedValue={year} onValueChange={setYear}>
            <Picker.Item label="Select year..." value="" />
            {years.map((y) => <Picker.Item key={y} label={y} value={y} />)}
          </Picker>
        </View>

        {/* ── MAKE DROPDOWN ─────────────────────────────────────────── */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Make</Text>
          {loadingMakes && <ActivityIndicator size="small" color="#1a73e8" style={styles.labelSpinner} />}
        </View>
        <View style={[styles.pickerWrapper, !year && styles.disabled]}>
          <Picker selectedValue={make} onValueChange={setMake} enabled={!!year && !loadingMakes}>
            <Picker.Item label={year ? 'Select make...' : 'Select year first'} value="" />
            {makes.map((m) => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>

        {/* ── MODEL DROPDOWN ────────────────────────────────────────── */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Model</Text>
          {loadingModels && <ActivityIndicator size="small" color="#1a73e8" style={styles.labelSpinner} />}
        </View>
        <View style={[styles.pickerWrapper, !make && styles.disabled]}>
          <Picker selectedValue={model} onValueChange={setModel} enabled={!!make && !loadingModels}>
            <Picker.Item label={make ? 'Select model...' : 'Select make first'} value="" />
            {models.map((m) => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>

        {/* ── ENGINE/TRIM DROPDOWN ───────────────────────────────────── */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Engine / Trim</Text>
          {loadingTrims && <ActivityIndicator size="small" color="#1a73e8" style={styles.labelSpinner} />}
        </View>
        <View style={[styles.pickerWrapper, !model && styles.disabled]}>
          <Picker selectedValue={trim} onValueChange={setTrim} enabled={!!model && !loadingTrims}>
            <Picker.Item label={model ? 'Select engine/trim...' : 'Select model first'} value="" />
            {trims.map((t) => <Picker.Item key={t} label={t} value={t} />)}
          </Picker>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Vehicle</Text>}
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
  title: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  savedSection: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 14, marginBottom: 20 },
  savedTitle: { fontWeight: '700', color: '#1a73e8', marginBottom: 6 },
  savedItem: { color: '#333', marginBottom: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  labelSpinner: { marginLeft: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#444' },
  pickerWrapper: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  disabled: { opacity: 0.45 }, // Makes the greyed-out dropdowns look inactive
  saveBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 14, alignItems: 'center' },
  backLinkText: { color: '#888', fontSize: 14 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../../config/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getYears, getMakes, getModels, getTrims } from '../../services/vehicleService';

export default function VehicleSetupScreen({ navigation }) {
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');

  const [years] = useState(getYears());
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [saving, setSaving] = useState(false);

  const [savedVehicles, setSavedVehicles] = useState([]);

  useEffect(() => {
    getDoc(doc(db, 'users', auth.currentUser.uid)).then((snap) => {
      if (snap.exists()) setSavedVehicles(snap.data().vehicles || []);
    });
  }, []);

  useEffect(() => {
    if (!year) return;
    setMake(''); setModel(''); setTrim('');
    setMakes([]); setModels([]); setTrims([]);
    setLoadingMakes(true);
    getMakes(year)
      .then(setMakes)
      .catch(() => Alert.alert('Error', 'Could not load makes. Check your connection.'))
      .finally(() => setLoadingMakes(false));
  }, [year]);

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
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        vehicles: arrayUnion(vehicle),
      });
      Alert.alert('Vehicle saved!', `${year} ${make} ${model} (${trim}) has been added.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
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

        <Text style={styles.label}>Year</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={year} onValueChange={setYear}>
            <Picker.Item label="Select year..." value="" />
            {years.map((y) => <Picker.Item key={y} label={y} value={y} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Make {loadingMakes && <ActivityIndicator size="small" color="#1a73e8" />}</Text>
        <View style={[styles.pickerWrapper, !year && styles.disabled]}>
          <Picker selectedValue={make} onValueChange={setMake} enabled={!!year && !loadingMakes}>
            <Picker.Item label={year ? 'Select make...' : 'Select year first'} value="" />
            {makes.map((m) => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Model {loadingModels && <ActivityIndicator size="small" color="#1a73e8" />}</Text>
        <View style={[styles.pickerWrapper, !make && styles.disabled]}>
          <Picker selectedValue={model} onValueChange={setModel} enabled={!!make && !loadingModels}>
            <Picker.Item label={make ? 'Select model...' : 'Select make first'} value="" />
            {models.map((m) => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Engine / Trim {loadingTrims && <ActivityIndicator size="small" color="#1a73e8" />}</Text>
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
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 12 },
  pickerWrapper: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  disabled: { opacity: 0.45 },
  saveBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 14, alignItems: 'center' },
  backLinkText: { color: '#888', fontSize: 14 },
});

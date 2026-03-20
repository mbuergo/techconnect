import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, storage } from '../../config/firebase';
import { getCurrentUserProfile } from '../../services/authService';
import StarRating from '../../components/StarRating';

const SPECIALTY_OPTIONS = [
  'Oil Change', 'Brakes', 'Tires', 'Engine', 'Transmission',
  'Electrical', 'AC/Heating', 'Suspension', 'Exhaust', 'Diagnostics',
];

export default function MechanicProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    getCurrentUserProfile(uid).then((p) => {
      if (p) {
        setProfile(p);
        setName(p.name || '');
        setBio(p.bio || '');
        setSpecialties(p.specialties || []);
        setPhotoUri(p.profilePhotoUrl || null);
      }
    });
  }, [uid]);

  function toggleSpecialty(s) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function uploadPhoto(uri) {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profilePhotos/${uid}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      let profilePhotoUrl = profile?.profilePhotoUrl || '';
      if (photoUri && photoUri !== profile?.profilePhotoUrl) {
        setUploading(true);
        profilePhotoUrl = await uploadPhoto(photoUri);
        setUploading(false);
      }
      await updateDoc(doc(db, 'users', uid), {
        name: name.trim(),
        bio: bio.trim(),
        specialties,
        profilePhotoUrl,
      });
      Alert.alert('Profile saved!', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  if (!profile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Profile</Text>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          <StarRating rating={profile.averageRating || 0} size={24} showValue />
          <Text style={styles.ratingCount}>({profile.totalRatings || 0} reviews)</Text>
        </View>

        <TouchableOpacity style={styles.photoWrapper} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditText}>Edit</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell customers about your experience and background..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Specialties</Text>
        <View style={styles.specialtiesGrid}>
          {SPECIALTY_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.specialtyChip, specialties.includes(s) && styles.specialtyChipSelected]}
              onPress={() => toggleSpecialty(s)}
            >
              <Text style={[styles.specialtyChipText, specialties.includes(s) && styles.specialtyChipTextSelected]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploading) && styles.disabled]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          {saving || uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 12 },
  ratingSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  ratingLabel: { fontSize: 14, color: '#555', marginRight: 4 },
  ratingCount: { fontSize: 13, color: '#888' },
  photoWrapper: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#dde', justifyContent: 'center', alignItems: 'center',
  },
  photoPlaceholderText: { fontSize: 13, color: '#666', textAlign: 'center', paddingHorizontal: 8 },
  photoEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#1a73e8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  photoEditText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111',
  },
  textArea: { minHeight: 90 },
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyChip: {
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff',
  },
  specialtyChipSelected: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  specialtyChipText: { fontSize: 13, color: '#555' },
  specialtyChipTextSelected: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  backLink: { marginTop: 14, alignItems: 'center' },
  backLinkText: { color: '#888', fontSize: 14 },
});

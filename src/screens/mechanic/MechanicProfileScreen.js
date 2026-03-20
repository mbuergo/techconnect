// MechanicProfileScreen.js — lets the mechanic edit their public profile.
// Includes name, bio, specialty chips (multi-select), and a profile photo.
// The photo is uploaded to Firebase Storage and the download URL is saved in Firestore.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
// expo-image-picker opens the phone's photo library or camera
import * as ImagePicker from 'expo-image-picker';
// Firebase Storage functions for uploading files
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, storage } from '../../config/firebase';
import { getCurrentUserProfile } from '../../services/authService';
import StarRating from '../../components/StarRating';

// The list of specialties the mechanic can choose from.
// Defined outside the component so it's not re-created on every render.
const SPECIALTY_OPTIONS = [
  'Oil Change', 'Brakes', 'Tires', 'Engine', 'Transmission',
  'Electrical', 'AC/Heating', 'Suspension', 'Exhaust', 'Diagnostics',
];

export default function MechanicProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState([]); // Array of selected specialty strings
  const [photoUri, setPhotoUri] = useState(null);     // Local URI of the chosen photo
  const [uploading, setUploading] = useState(false);  // True while uploading photo to Storage
  const [saving, setSaving] = useState(false);
  const uid = auth.currentUser?.uid;

  // Load current profile data and pre-fill the form fields
  useEffect(() => {
    getCurrentUserProfile(uid).then((p) => {
      if (p) {
        setProfile(p);
        setName(p.name || '');
        setBio(p.bio || '');
        setSpecialties(p.specialties || []);
        // photoUri starts as the existing Firestore URL (if there is one)
        setPhotoUri(p.profilePhotoUrl || null);
      }
    });
  }, [uid]);

  // Toggle a specialty on/off when the mechanic taps a chip.
  // If it's already in the array, remove it. Otherwise add it.
  function toggleSpecialty(s) {
    setSpecialties((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s) // Remove: keep everything except `s`
        : [...prev, s]                 // Add: spread old array + append s
    );
  }

  // Opens the phone's photo library for the mechanic to pick a profile photo
  async function handlePickPhoto() {
    // Ask for permission to access the photo library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Let the user crop the photo
      aspect: [1, 1],      // Force a square crop (good for profile circles)
      quality: 0.7,        // 70% quality — smaller file size, still looks good
    });

    if (!result.canceled && result.assets?.[0]) {
      // Store the local file path (e.g. file:///data/user/0/...jpg)
      // We don't upload yet — we wait until Save is tapped
      setPhotoUri(result.assets[0].uri);
    }
  }

  // Uploads the local photo file to Firebase Storage and returns a public download URL
  async function uploadPhoto(uri) {
    // fetch() can read local file:// URIs in React Native
    const response = await fetch(uri);
    // blob() converts the response to binary data that Firebase Storage can accept
    const blob = await response.blob();

    // ref() creates a storage path: profilePhotos/{uid}.jpg
    // Each mechanic only has one photo — saving with the same path overwrites the old one
    const storageRef = ref(storage, `profilePhotos/${uid}.jpg`);

    // uploadBytes sends the binary data to Firebase Storage
    await uploadBytes(storageRef, blob);

    // getDownloadURL returns the public HTTPS URL we can use in <Image source={{ uri: ... }} />
    return getDownloadURL(storageRef);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      // Start with the existing photo URL in case no new photo was picked
      let profilePhotoUrl = profile?.profilePhotoUrl || '';

      // Only upload if the user picked a new photo (different from what's already saved)
      if (photoUri && photoUri !== profile?.profilePhotoUrl) {
        setUploading(true);
        profilePhotoUrl = await uploadPhoto(photoUri); // Upload and get the public URL
        setUploading(false);
      }

      // Save all profile fields to Firestore
      await updateDoc(doc(db, 'users', uid), {
        name: name.trim(),
        bio: bio.trim(),
        specialties,        // The array of selected specialty strings
        profilePhotoUrl,    // The Firebase Storage HTTPS URL (or empty string)
      });

      Alert.alert('Profile saved!', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  // Show spinner until profile loads
  if (!profile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Profile</Text>

        {/* Read-only display of the mechanic's current average rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          {/* No onRate prop = display-only mode */}
          <StarRating rating={profile.averageRating || 0} size={24} showValue />
          <Text style={styles.ratingCount}>({profile.totalRatings || 0} reviews)</Text>
        </View>

        {/* Profile photo — tapping it opens the photo picker */}
        <TouchableOpacity style={styles.photoWrapper} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
            </View>
          )}
          {/* Small "Edit" badge overlaid on the bottom-right of the photo */}
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

        {/* Specialty chips — tap to toggle on/off */}
        <Text style={styles.label}>Specialties</Text>
        <View style={styles.specialtiesGrid}>
          {SPECIALTY_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              // Apply selected style on top of base chip style when this specialty is chosen
              style={[styles.specialtyChip, specialties.includes(s) && styles.specialtyChipSelected]}
              onPress={() => toggleSpecialty(s)}
            >
              <Text style={[styles.specialtyChipText, specialties.includes(s) && styles.specialtyChipTextSelected]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button is disabled during upload or save to prevent double-tapping */}
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
    position: 'absolute', bottom: 2, right: 2,   // Overlay on bottom-right of the photo
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
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, // Chips wrap to next line
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

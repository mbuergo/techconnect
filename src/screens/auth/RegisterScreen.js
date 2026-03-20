// RegisterScreen.js — new user sign-up form.
// Collects name, email, and password, validates them, then creates
// both a Firebase Auth account and a Firestore user document.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, // Lets the page scroll if the keyboard pushes it off screen
} from 'react-native';
import { register } from '../../services/authService';

export default function RegisterScreen({ navigation }) {
  // One state variable per form field
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); // "Confirm password" field
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    // Run all validations before calling Firebase — give the user clear feedback
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      // Firebase Auth requires passwords to be at least 6 characters
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // register() creates the Firebase Auth account AND the Firestore user document
      await register(email.trim(), password, name.trim());
      // After register() succeeds, onAuthStateChanged in App.js fires,
      // which triggers AppNavigator to fetch the role.
      // Since role is null on a new account, AppNavigator shows RoleSelectScreen.
    } catch (e) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ScrollView allows scrolling if content is taller than the screen.
          keyboardShouldPersistTaps="handled" ensures tapping a button while the
          keyboard is open submits the form instead of just dismissing the keyboard. */}
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join TechConnect today</Text>

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#aaa"
          value={name} onChangeText={setName} />

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa"
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor="#aaa"
          value={password} onChangeText={setPassword} secureTextEntry />

        <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#aaa"
          value={confirm} onChangeText={setConfirm} secureTextEntry />

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        {/* Go back to Login if the user already has an account */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: {
    flexGrow: 1,               // flexGrow allows the ScrollView content to expand
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a73e8', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 30 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#111', marginBottom: 14,
  },
  btn: {
    backgroundColor: '#1a73e8', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 22, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#555' },
  linkBold: { color: '#1a73e8', fontWeight: '700' },
});

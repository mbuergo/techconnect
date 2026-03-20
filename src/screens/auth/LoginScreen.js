// LoginScreen.js — the first screen a returning user sees.
// Contains email + password fields and a button that calls Firebase Auth.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, // Pushes content up when the keyboard opens so inputs stay visible
  Platform,            // Lets us check if we're on iOS or Android
  ActivityIndicator,   // Spinning loading indicator
  Alert,               // Shows a native popup dialog
} from 'react-native';
import { login } from '../../services/authService';

// `navigation` is automatically passed to every screen by React Navigation.
// It has methods like navigation.navigate('ScreenName') to go to other screens.
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // True while waiting for Firebase

  async function handleLogin() {
    // Basic validation before making any network calls
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return; // Stop here — don't continue with empty fields
    }

    setLoading(true); // Show spinner on the button
    try {
      await login(email.trim(), password);
      // No navigation.navigate() call here! After login succeeds, Firebase fires
      // onAuthStateChanged in App.js, which re-renders AppNavigator with the user,
      // which automatically shows the correct home screen. Navigation is automatic.
    } catch (e) {
      // Firebase gives descriptive error messages like "auth/wrong-password"
      Alert.alert('Login failed', e.message);
    } finally {
      // `finally` runs whether the try succeeded or the catch ran.
      // Always turn off the spinner when done.
      setLoading(false);
    }
  }

  return (
    // KeyboardAvoidingView shifts the screen up on iOS when the keyboard appears
    // so the password input doesn't get hidden behind it.
    // behavior="padding" (iOS) adds padding to push content up.
    // On Android the OS handles this automatically, so we pass undefined.
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>TechConnect</Text>
        <Text style={styles.tagline}>Your mechanic, on demand.</Text>

        {/* Email input — keyboardType="email-address" shows the @ key on the keyboard */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}       // Called every time the text changes
          keyboardType="email-address"
          autoCapitalize="none"         // Don't auto-capitalize (emails are lowercase)
        />

        {/* Password input — secureTextEntry hides the characters with dots */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Button shows a spinner while loading, text otherwise */}
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
        </TouchableOpacity>

        {/* Link to RegisterScreen — navigation.navigate() pushes a new screen onto the stack */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: {
    flex: 1,
    justifyContent: 'center',  // Vertically center the form on the screen
    paddingHorizontal: 28,
  },
  logo: { fontSize: 34, fontWeight: '800', color: '#1a73e8', textAlign: 'center', marginBottom: 4 },
  tagline: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 36 },
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

// App.js — the entry point of the entire application.
// React Native starts here. Everything else is loaded from this file.

// React is the core library. useEffect runs code after the screen renders.
// useState stores values that can change over time (like whether a user is logged in).
import React, { useEffect, useState } from 'react';

// These are built-in React Native UI components:
// ActivityIndicator = spinning loading circle
// View = a container box (like a <div> in web)
// StyleSheet = lets us write CSS-like styles
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// NavigationContainer wraps the whole app and enables screen-to-screen navigation.
// Think of it like the "router" in a web app.
import { NavigationContainer } from '@react-navigation/native';

// GestureHandlerRootView is required by the navigation library to recognize
// swipe gestures (like swiping back to go to the previous screen).
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// onAuthStateChanged is a Firebase function that fires whenever the user
// logs in or logs out. It's how we know if someone is authenticated.
import { onAuthStateChanged } from 'firebase/auth';

// Our Firebase auth instance (configured in firebase.js).
import { auth } from './src/config/firebase';

// AppNavigator decides which screens to show based on the user's login state and role.
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // `user` holds the currently logged-in Firebase user object.
  // We start it as `undefined` (not null!) to mean "we haven't checked yet."
  // null means "checked and not logged in." An object means "logged in."
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // onAuthStateChanged sets up a real-time listener. Firebase calls the
    // callback immediately with the current user, then again whenever the
    // auth state changes (login, logout, token refresh).
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // null if logged out, user object if logged in
    });

    // Returning the unsubscribe function tells React to stop listening
    // when the App component is removed from screen (cleanup).
    return unsubscribe;
  }, []); // Empty array [] means this effect runs once when the app starts

  // While Firebase is checking auth state, show a loading spinner
  // so there's no flash of the wrong screen.
  if (user === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  // Once we know the auth state, render the full app.
  // GestureHandlerRootView must be the outermost wrapper for gestures to work.
  // NavigationContainer manages the navigation history (the "back stack").
  // AppNavigator receives the user and decides which screens to show.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator user={user} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,                    // Take up the full screen height
    justifyContent: 'center',   // Center vertically
    alignItems: 'center',       // Center horizontally
    backgroundColor: '#fff',
  },
});

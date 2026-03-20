// MechanicCard.js — a single card in the list of nearby mechanics.
// Shown on CustomerHomeScreen after the customer taps "Find Nearby Mechanics".
// Tapping the card navigates to RequestServiceScreen with this mechanic pre-selected.

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import StarRating from './StarRating'; // Reuse our star rating display component

// Props:
//   mechanic — the mechanic's Firestore user document (with a `distance` field added)
//   onSelect — function called when the card is tapped, receives the mechanic object
export default function MechanicCard({ mechanic, onSelect }) {
  return (
    // The whole card is tappable. onPress calls onSelect with the mechanic data.
    // activeOpacity={0.85} gives a slight dim effect when pressed.
    <TouchableOpacity style={styles.card} onPress={() => onSelect(mechanic)} activeOpacity={0.85}>

      {/* Profile photo or a fallback circle showing their initial */}
      <View style={styles.avatar}>
        {mechanic.profilePhotoUrl ? (
          // Load the photo from the Firebase Storage URL stored in Firestore
          <Image source={{ uri: mechanic.profilePhotoUrl }} style={styles.photo} />
        ) : (
          // No photo yet — show a colored circle with the first letter of their name
          <View style={styles.placeholder}>
            <Text style={styles.initials}>
              {(mechanic.name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name, star rating, and specialties */}
      <View style={styles.info}>
        <Text style={styles.name}>{mechanic.name}</Text>

        {/* Star rating row: small stars + numeric value + review count */}
        <View style={styles.ratingRow}>
          <StarRating rating={mechanic.averageRating || 0} size={16} showValue />
          <Text style={styles.ratingCount}>({mechanic.totalRatings || 0} reviews)</Text>
        </View>

        {/* Show specialties if the mechanic has set any (joined with a dot separator) */}
        {mechanic.specialties?.length > 0 && (
          <Text style={styles.specialties} numberOfLines={1}>
            {mechanic.specialties.join(' · ')}
          </Text>
        )}
      </View>

      {/* Distance badge on the right side of the card */}
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>
          {/* toFixed(1) formats to 1 decimal place, e.g. 3.7 mi */}
          {mechanic.distance !== undefined ? mechanic.distance.toFixed(1) : '—'} mi
        </Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',      // Lay out children left-to-right
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',      // Vertically center everything in the row
    // Shadow (iOS) and elevation (Android) create the card's drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: { marginRight: 12 },
  photo: { width: 52, height: 52, borderRadius: 26 }, // borderRadius = half of size → circle
  placeholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#fff', fontSize: 22, fontWeight: '700' },
  info: { flex: 1 }, // flex: 1 makes this section expand to fill available space
  name: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingCount: { fontSize: 12, color: '#888', marginLeft: 4 },
  specialties: { fontSize: 12, color: '#555' },
  distanceBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  distanceText: { color: '#1a73e8', fontWeight: '600', fontSize: 13 },
});

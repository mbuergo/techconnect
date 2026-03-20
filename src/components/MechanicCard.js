import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import StarRating from './StarRating';

/**
 * MechanicCard — shown in the list on CustomerHomeScreen.
 * Props: mechanic object, onSelect callback
 */
export default function MechanicCard({ mechanic, onSelect }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onSelect(mechanic)} activeOpacity={0.85}>
      <View style={styles.avatar}>
        {mechanic.profilePhotoUrl ? (
          <Image source={{ uri: mechanic.profilePhotoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.initials}>{(mechanic.name || '?')[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{mechanic.name}</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={mechanic.averageRating || 0} size={16} showValue />
          <Text style={styles.ratingCount}>({mechanic.totalRatings || 0} reviews)</Text>
        </View>
        {mechanic.specialties?.length > 0 && (
          <Text style={styles.specialties} numberOfLines={1}>
            {mechanic.specialties.join(' · ')}
          </Text>
        )}
      </View>
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>
          {mechanic.distance !== undefined ? mechanic.distance.toFixed(1) : '—'} mi
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: { marginRight: 12 },
  photo: { width: 52, height: 52, borderRadius: 26 },
  placeholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#fff', fontSize: 22, fontWeight: '700' },
  info: { flex: 1 },
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

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * StarRating
 * Props:
 *   rating        — controlled value (0–5)
 *   onRate        — called with new star count; omit to make read-only
 *   size          — star font size (default 32)
 *   showValue     — show numeric value next to stars
 */
export default function StarRating({ rating = 0, onRate, size = 32, showValue = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate && onRate(star)}
          onPressIn={() => onRate && setHovered(star)}
          onPressOut={() => setHovered(0)}
          disabled={!onRate}
          activeOpacity={0.7}
        >
          <Text style={[styles.star, { fontSize: size, color: star <= display ? '#f5a623' : '#d0d0d0' }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
      {showValue && (
        <Text style={[styles.value, { fontSize: size * 0.5 }]}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { marginHorizontal: 2 },
  value: { marginLeft: 8, color: '#555' },
});

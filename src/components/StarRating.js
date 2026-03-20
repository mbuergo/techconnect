// StarRating.js — a reusable star rating widget used in two ways:
//   1. Interactive (pass onRate): customer/mechanic can tap to pick 1–5 stars
//   2. Display-only (no onRate): shows a mechanic's average rating on their card

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

// Props this component accepts:
//   rating    — the currently selected/displayed value (0–5)
//   onRate    — function called when a star is tapped; omit to make read-only
//   size      — how large the star characters are (default 32px)
//   showValue — whether to show the numeric value after the stars (e.g. "4.3")
export default function StarRating({ rating = 0, onRate, size = 32, showValue = false }) {
  // `hovered` tracks which star the user is pressing down on.
  // This creates a visual preview before they lift their finger.
  const [hovered, setHovered] = useState(0);

  // Show the hovered star count while pressing, otherwise show the real rating.
  // The || operator returns `rating` when `hovered` is 0 (falsy).
  const display = hovered || rating;

  return (
    <View style={styles.row}>
      {/* Create one star button for each value 1 through 5 */}
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate && onRate(star)}       // Call onRate only if it was provided
          onPressIn={() => onRate && setHovered(star)} // Show preview when finger touches
          onPressOut={() => setHovered(0)}             // Remove preview when finger lifts
          disabled={!onRate}   // Can't tap if no onRate function (display-only mode)
          activeOpacity={0.7}  // Slightly dim on press for visual feedback
        >
          <Text style={[
            styles.star,
            {
              fontSize: size,
              // Gold color if this star is within the displayed rating, grey otherwise
              color: star <= display ? '#f5a623' : '#d0d0d0',
            },
          ]}>
            ★  {/* Unicode filled star character */}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Optionally show the numeric value after the stars (e.g. "4.3") */}
      {showValue && (
        <Text style={[styles.value, { fontSize: size * 0.5 }]}>
          {/* Show the number if rated, em-dash if no ratings yet */}
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' }, // Stars in a horizontal line
  star: { marginHorizontal: 2 },
  value: { marginLeft: 8, color: '#555' },
});

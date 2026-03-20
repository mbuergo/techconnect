// JobStatusBanner.js — a colored status bar that shows the current job state.
// Displayed on both the customer's TrackJobScreen and the mechanic's ActiveJobScreen.
// The color and message automatically change based on the status string passed in.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Import the JOB_STATUS constants so we're not comparing against raw strings.
// This way if a status value ever changes, we only update it in one place.
import { JOB_STATUS } from '../services/jobService';

// A lookup table that maps each status to its display text and color scheme.
// Using a table like this is cleaner than a long if/else chain.
const STATUS_CONFIG = {
  [JOB_STATUS.PENDING]:     { label: 'Waiting for a mechanic...', color: '#f5a623', bg: '#fff8ee' }, // amber
  [JOB_STATUS.ACCEPTED]:    { label: 'Mechanic accepted your request', color: '#1a73e8', bg: '#e8f0fe' }, // blue
  [JOB_STATUS.EN_ROUTE]:    { label: 'Mechanic is on the way', color: '#0f9d58', bg: '#e6f4ea' }, // green
  [JOB_STATUS.IN_PROGRESS]: { label: 'Service in progress', color: '#9334e9', bg: '#f3e8fd' }, // purple
  [JOB_STATUS.COMPLETE]:    { label: 'Job complete!', color: '#137333', bg: '#ceead6' }, // dark green
};

// Props:
//   status — one of the JOB_STATUS values (e.g. 'pending', 'accepted', etc.)
export default function JobStatusBanner({ status }) {
  // Look up the config for this status. If the status is somehow unknown,
  // fall back to a neutral grey style and show the raw status string.
  const config = STATUS_CONFIG[status] || { label: status, color: '#888', bg: '#f0f0f0' };

  return (
    // Apply the background and border colors dynamically from the config
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.color }]}>
      {/* Small colored circle on the left — the "status dot" */}
      <View style={[styles.dot, { backgroundColor: config.color }]} />

      {/* Status message text, colored to match */}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',   // Dot and text side by side
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,       // Colored border that matches the status color
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,  // Half of width/height = perfect circle
    marginRight: 10,
  },
  label: { fontSize: 15, fontWeight: '600' },
});

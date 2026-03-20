import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { JOB_STATUS } from '../services/jobService';

const STATUS_CONFIG = {
  [JOB_STATUS.PENDING]: { label: 'Waiting for a mechanic...', color: '#f5a623', bg: '#fff8ee' },
  [JOB_STATUS.ACCEPTED]: { label: 'Mechanic accepted your request', color: '#1a73e8', bg: '#e8f0fe' },
  [JOB_STATUS.EN_ROUTE]: { label: 'Mechanic is on the way', color: '#0f9d58', bg: '#e6f4ea' },
  [JOB_STATUS.IN_PROGRESS]: { label: 'Service in progress', color: '#9334e9', bg: '#f3e8fd' },
  [JOB_STATUS.COMPLETE]: { label: 'Job complete!', color: '#137333', bg: '#ceead6' },
};

export default function JobStatusBanner({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#888', bg: '#f0f0f0' };
  return (
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.color }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  label: { fontSize: 15, fontWeight: '600' },
});

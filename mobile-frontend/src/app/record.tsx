import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteMapPreview } from '../components/common/RouteMapPreview';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';

export default function RecordCockpitScreen() {
  const router = useRouter();
  const {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
  } = useApp();

  const [selectedSport, setSelectedSport] = useState<SportType>(activeRecording.sportType || 'Run');
  const [autoPause, setAutoPause] = useState(true);

  // Time format helper
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Pace format helper
  const formatPace = () => {
    if (activeRecording.distanceMeters <= 50 || activeRecording.currentSpeedMps <= 0.1) {
      return '-:--';
    }
    if (selectedSport === 'Ride') {
      return `${(activeRecording.currentSpeedMps * 3.6).toFixed(1)} km/h`;
    }
    const secPerKm = Math.round(1000 / activeRecording.currentSpeedMps);
    const m = Math.floor(secPerKm / 60);
    const s = secPerKm % 60;
    return `${m}:${s < 10 ? '0' : ''}${s} /km`;
  };

  const handleStart = () => {
    startRecording(selectedSport);
  };

  const handleFinish = () => {
    finishRecording();
    router.push('/save-activity');
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'Are you sure you want to discard this recorded activity?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardRecording();
          router.back();
        },
      },
    ]);
  };

  const handleClose = () => {
    if (activeRecording.isRecording) {
      Alert.alert(
        'Recording Active',
        'Your workout is currently recording. Do you want to pause and minimize or discard?',
        [
          { text: 'Keep Recording', style: 'cancel' },
          {
            text: 'Minimize',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.sportSelector}>
          {(['Run', 'Ride', 'Hike', 'Walk'] as SportType[]).map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
              onPress={() => !activeRecording.isRecording && setSelectedSport(sport)}>
              <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="cog-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Cockpit Digital Metrics */}
      <View style={styles.metricsContainer}>
        {/* Main Distance */}
        <View style={styles.primaryMetric}>
          <Text style={styles.primaryLabel}>DISTANCE (KM)</Text>
          <Text style={styles.primaryValue}>
            {(activeRecording.distanceMeters / 1000).toFixed(2)}
          </Text>
        </View>

        <View style={styles.metricGrid}>
          {/* Time */}
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>TIME</Text>
            <Text style={styles.gridValue}>{formatTime(activeRecording.movingSeconds)}</Text>
          </View>

          {/* Current Pace / Speed */}
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>
              {selectedSport === 'Ride' ? 'SPEED' : 'CURRENT PACE'}
            </Text>
            <Text style={styles.gridValue}>{formatPace()}</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          {/* Elevation Gain */}
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>ELEVATION GAIN</Text>
            <Text style={styles.gridValue}>+{activeRecording.elevationGainMeters} m</Text>
          </View>

          {/* Heart Rate & Zone */}
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>HEART RATE</Text>
            <View style={styles.hrRow}>
              <Ionicons name="heart" size={18} color={Colors.heartRate} />
              <Text style={[styles.gridValue, { marginLeft: 4 }]}>
                {activeRecording.currentHeartRate > 0 ? `${activeRecording.currentHeartRate} bpm` : '--'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Mini-Map Trail Preview */}
      <View style={styles.mapContainer}>
        <RouteMapPreview height={140} points={activeRecording.routeCoordinates} />
      </View>

      {/* Auto-Pause Toggle */}
      <View style={styles.autoPauseBar}>
        <Text style={styles.autoPauseText}>Smart Auto-Pause (Threshold &lt; 0.8 m/s)</Text>
        <Switch
          value={autoPause}
          onValueChange={setAutoPause}
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>

      {/* Tactile Control Buttons */}
      <View style={styles.controlsContainer}>
        {!activeRecording.isRecording ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>START {selectedSport.toUpperCase()}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            {activeRecording.isPaused ? (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resumeBtn]}
                  onPress={resumeRecording}>
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>RESUME</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.finishBtn]}
                  onPress={handleFinish}>
                  <Ionicons name="flag" size={22} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>FINISH</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.discardBtn]}
                  onPress={handleDiscard}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.pauseBtn]}
                onPress={pauseRecording}>
                <Ionicons name="pause" size={28} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>PAUSE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  settingsBtn: {
    padding: Spacing.xs,
  },
  sportSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 3,
    gap: 2,
  },
  sportChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  sportChipActive: {
    backgroundColor: Colors.primary,
  },
  sportChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  sportChipTextActive: {
    color: Colors.textInverse,
  },
  metricsContainer: {
    padding: Spacing.lg,
  },
  primaryMetric: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  primaryValue: {
    fontSize: 64,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.mono,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.mono,
  },
  hrRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  autoPauseBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  autoPauseText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  controlsContainer: {
    marginTop: 'auto',
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionBtn: {
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
  },
  resumeBtn: {
    flex: 2,
    backgroundColor: '#10B981',
  },
  finishBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
  },
  discardBtn: {
    width: 60,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
});


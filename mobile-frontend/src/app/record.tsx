import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { loadLastSport, SportSheet } from '../components/record/SportSheet';
import {
  AppText,
  Button,
  color,
  elevation,
  IconButton,
  MetricTile,
  radius,
  space,
} from '../design';
import { estimateCalories } from '../lib/calories';
import { DASH, formatClock, formatElevation, kmValue, paceValue, speedValue } from '../lib/format';
import { recordingEngine } from '../tracking/engine';
import { gpsStatus, liveSpeed, timerSeconds, useNow, useRecording } from '../tracking/useRecording';
import { sportConfig } from '../lib/sports';
import { SportType } from '../types';

/**
 * Recorder (reference: ScreensDesign 374878 pre-start, 374732 recording, 374733 paused,
 * 374717 stats view). Behaviour rules: research §3, §5, §8.
 *
 * All recording logic lives in src/tracking (engine + background task); this screen only presents
 * it and sends commands. Closing the screen never discards — discarding is only on the Save screen.
 */
export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rec = useRecording();
  const status = rec.lifecycle.status;
  const isIdle = status === 'idle' || status === 'preparing';
  const isPaused = status === 'paused';
  const interrupted = rec.lifecycle.pauseReason === 'interrupted';
  const now = useNow(true);

  const [sport, setSport] = useState<SportType>(isIdle ? 'Run' : (rec.sport as SportType));
  const [sportSheet, setSportSheet] = useState(false);
  const [statsView, setStatsView] = useState(false);
  const [following, setFollowing] = useState(true);
  const [starting, setStarting] = useState(false);

  const cfg = sportConfig(isIdle ? sport : rec.sport);

  // Preselect the last-used sport (research §1).
  useEffect(() => {
    if (!isIdle) return;
    loadLastSport().then((s) => s && setSport(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PREPARING: warm up GPS while the athlete is on this screen; stop if they leave without starting.
  useEffect(() => {
    recordingEngine.prepare();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recordingEngine.refreshPermission());
    return () => {
      sub.remove();
      recordingEngine.cancelPrepare();
    };
  }, []);

  const gps = gpsStatus(rec, now);
  const route = rec.route;
  const userPosition = rec.lastFix ? ([rec.lastFix.lng, rec.lastFix.lat] as [number, number]) : null;

  // ---- Status strip -------------------------------------------------------------------------
  let strip: { text: string; bg: string; fg: string; action?: () => void };
  if (gps === 'denied')
    strip = { text: 'Location access needed · Open settings', bg: color.dangerSoft, fg: color.danger, action: () => Linking.openSettings() };
  else if (gps === 'off')
    strip = { text: 'Location is off · Turn on', bg: color.dangerSoft, fg: color.danger, action: () => Linking.openSettings() };
  else if (interrupted)
    strip = { text: 'RECORDING WAS INTERRUPTED · Resume or finish', bg: color.warning, fg: color.ink };
  else if (isPaused) strip = { text: 'PAUSED', bg: color.warning, fg: color.ink };
  else if (isIdle) {
    if (gps === 'acquiring') strip = { text: 'Acquiring GPS…', bg: color.canvas, fg: color.inkSecondary };
    else if (gps === 'good') strip = { text: 'GPS ready', bg: color.successSoft, fg: color.successText };
    else strip = { text: `Weak GPS (±${Math.round(rec.lastFix?.acc ?? 99)} m)`, bg: color.warningSoft, fg: color.ink };
  } else {
    const suffix = gps === 'lost' ? ' · GPS SIGNAL LOST' : gps === 'weak' || gps === 'acquiring' ? ' · WEAK GPS' : '';
    strip = { text: `${cfg.label.toUpperCase()}${suffix}`, bg: suffix ? color.warningSoft : color.surface, fg: color.ink };
  }

  // ---- Metrics (research §5: runs show avg pace; rides show current speed, avg when paused) ----
  const time = formatClock(isIdle ? 0 : timerSeconds(rec, now));
  const distance = kmValue(rec.distanceM);
  const avgSpeed = rec.movingTimeS > 0 ? rec.distanceM / rec.movingTimeS : null;
  const second =
    cfg.primaryMetric === 'speed'
      ? status === 'recording'
        ? { label: 'Speed (km/h)', value: speedValue(liveSpeed(rec, now)) }
        : { label: 'Avg speed (km/h)', value: isIdle ? DASH : speedValue(avgSpeed) }
      : { label: 'Avg pace (/km)', value: paceValue(rec.distanceM, rec.movingTimeS) };
  const calories = estimateCalories(cfg.id, rec.distanceM, rec.movingTimeS);

  const onStart = async () => {
    setFollowing(true);
    setStarting(true);
    try {
      await recordingEngine.start(sport);
    } catch (e: any) {
      Alert.alert('Can’t start recording', e?.message ?? 'Please try again.');
    } finally {
      setStarting(false);
    }
  };
  const pauseRecording = () => recordingEngine.pause();
  const resumeRecording = () => recordingEngine.resume();

  const onFinish = () => router.push('/save-activity');

  const statusStrip = (
    <Pressable
      onPress={strip.action}
      disabled={!strip.action}
      accessibilityRole={strip.action ? 'button' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.strip, { backgroundColor: strip.bg }]}>
      <AppText variant="strip" style={{ color: strip.fg, textAlign: 'center' }}>
        {strip.text}
      </AppText>
    </Pressable>
  );

  // ---- Controls -----------------------------------------------------------------------------
  const controls = isIdle ? (
    <View style={styles.idleControls}>
      <Pressable
        onPress={() => setSportSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sport: ${cfg.label}. Change sport`}
        style={styles.sideControl}>
        <View style={styles.sportCircle}>
          <Ionicons name={cfg.icon} size={26} color={color.brandText} />
        </View>
        <AppText variant="label" style={{ marginTop: space.xs, fontWeight: '600' }}>
          {cfg.label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onStart}
        disabled={starting || gps === 'denied' || gps === 'off'}
        accessibilityRole="button"
        accessibilityLabel={`Start ${cfg.label}`}
        style={({ pressed }) => [styles.startButton, pressed && { backgroundColor: color.brandPressed }]}>
        <Ionicons name="play" size={36} color={color.inverse} style={{ marginLeft: 4 }} />
      </Pressable>
      <View style={styles.sideControl} />
    </View>
  ) : isPaused ? (
    <View style={styles.row}>
      <Button label="Resume" icon="play" size="lg" onPress={resumeRecording} style={{ flex: 1 }} />
      <Button label="Finish" icon="flag" size="lg" variant="dark" onPress={onFinish} style={{ flex: 1, marginLeft: space.md }} />
    </View>
  ) : (
    <Button label="Pause" icon="pause" size="lg" fullWidth onPress={pauseRecording} />
  );

  // ---- Stats-only view (reference 374717) ---------------------------------------------------
  if (statsView) {
    return (
      <View style={[styles.statsScreen, { paddingTop: insets.top }]}>
        <View style={styles.statsTop}>
          <IconButton icon="chevron-down" accessibilityLabel="Minimize recorder" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
          <IconButton icon="map-outline" accessibilityLabel="Show map" onPress={() => setStatsView(false)} />
        </View>
        {statsStrip(statusStrip)}
        <View style={styles.statsBody}>
          <MetricTile label="Time" value={time} size="display" align="center" />
          <MetricTile label={second.label} value={second.value} size="display" align="center" />
          <MetricTile label="Distance (km)" value={distance} size="display" align="center" />
          <View style={[styles.row, { marginTop: space.lg }]}>
            <MetricTile label="Elevation gain" value={formatElevation(rec.elevGainM)} size="L" align="center" style={{ flex: 1 }} />
            <MetricTile label="Calories (est.)" value={calories ? String(calories) : DASH} size="L" align="center" style={{ flex: 1 }} />
          </View>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>{controls}</View>
        <SportSheet visible={sportSheet} selected={sport} onSelect={(s) => { setSport(s); setSportSheet(false); }} onClose={() => setSportSheet(false)} />
      </View>
    );
  }

  // ---- Map view (default) -------------------------------------------------------------------
  return (
    <View style={styles.screen}>
      <MapView
        mode="live"
        route={route}
        userPosition={userPosition}
        following={following}
        onFollowingChange={setFollowing}
        padding={{ bottom: 280 }}
      />

      <View style={[styles.topOverlay, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton
          icon="chevron-down"
          appearance="floating"
          accessibilityLabel={isIdle ? 'Close recorder' : 'Minimize recorder, recording continues'}
          onPress={() => router.back()}
        />
        {!following ? (
          <IconButton icon="locate" appearance="floating" accessibilityLabel="Recenter on my location" onPress={() => setFollowing(true)} />
        ) : null}
      </View>

      <View style={[styles.bottomArea]} pointerEvents="box-none">
        <View style={[styles.metricsCard, elevation.floating]}>
          <View style={styles.stripRow}>
            <View style={{ flex: 1 }}>{statusStrip}</View>
            <IconButton icon="expand-outline" size={40} accessibilityLabel="Show large stats" onPress={() => setStatsView(true)} style={styles.expand} />
          </View>
          <View style={styles.metricsRow}>
            <MetricTile label="Time" value={time} size="XL" align="center" style={styles.metricCell} />
            <MetricTile label={second.label} value={second.value} size="XL" align="center" style={styles.metricCell} />
            <MetricTile label="Distance (km)" value={distance} size="XL" align="center" style={styles.metricCell} />
          </View>
        </View>
        <View style={[styles.sheet, elevation.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          {controls}
        </View>
      </View>

      <SportSheet
        visible={sportSheet}
        selected={sport}
        onSelect={(s) => {
          setSport(s);
          setSportSheet(false);
        }}
        onClose={() => setSportSheet(false)}
      />
    </View>
  );
}

const statsStrip = (strip: React.ReactNode) => (
  <View style={{ marginHorizontal: space.gutter, borderRadius: radius.md, overflow: 'hidden' }}>{strip}</View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  row: { flexDirection: 'row', alignItems: 'center' },
  topOverlay: {
    position: 'absolute',
    left: space.gutter,
    right: space.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomArea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  metricsCard: {
    marginHorizontal: space.gutter,
    marginBottom: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  stripRow: { flexDirection: 'row', alignItems: 'stretch' },
  strip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: space.md },
  expand: { position: 'absolute', right: 2, top: 0 },
  metricsRow: { flexDirection: 'row', paddingVertical: space.lg, paddingHorizontal: space.sm },
  metricCell: { flex: 1 },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderStrong,
    marginBottom: space.lg,
  },
  idleControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideControl: { width: 88, alignItems: 'center' },
  sportCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.floating,
  },
  statsScreen: { flex: 1, backgroundColor: color.surface },
  statsTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, height: 56 },
  statsBody: { flex: 1, justifyContent: 'space-evenly', paddingHorizontal: space.gutter },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { loadLastSport, SportSheet } from '../components/record/SportSheet';
import {
  Button,
  IconButton,
  MetricTile,
} from '../design';
import { estimateCalories } from '../lib/calories';
import { DASH, formatClock, formatDuration, formatElevation, kmValue, paceValue, speedValue } from '../lib/format';
import { recordingEngine } from '../tracking/engine';
import { gpsStatus, liveSpeed, timerSeconds, useNow, useRecording } from '../tracking/useRecording';
import { plannedRouteStore, usePlannedRoute } from '../lib/plannedRoute';
import { MVP_SPORTS, sportConfig } from '../lib/sports';
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
  const params = useLocalSearchParams<{ sport?: string }>();
  const rec = useRecording();
  const status = rec.lifecycle.status;
  const isIdle = status === 'idle' || status === 'preparing';
  const isPaused = status === 'paused';
  const interrupted = rec.lifecycle.pauseReason === 'interrupted';
  const now = useNow(true);

  // Workout tab passes ?sport=…; otherwise the last-used sport is preselected below.
  const requested = MVP_SPORTS.some((x) => x.id === params.sport) ? (params.sport as SportType) : null;
  const [sport, setSport] = useState<SportType>(isIdle ? (requested ?? 'Run') : (rec.sport as SportType));
  const [sportSheet, setSportSheet] = useState(false);
  const [statsView, setStatsView] = useState(false);
  const [following, setFollowing] = useState(true);
  const [starting, setStarting] = useState(false);

  const cfg = sportConfig(isIdle ? sport : rec.sport);

  // Preselect the last-used sport (research §1).
  useEffect(() => {
    if (!isIdle || requested) return;
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
    strip = { text: 'Location access needed · Open settings', bg: '#FEE2E2', fg: '#DC2626', action: () => Linking.openSettings() };
  else if (gps === 'off')
    strip = { text: 'Location is off · Turn on', bg: '#FEE2E2', fg: '#DC2626', action: () => Linking.openSettings() };
  else if (interrupted)
    strip = { text: 'RECORDING WAS INTERRUPTED · Resume or finish', bg: '#F59E0B', fg: '#1F2937' };
  else if (isPaused) strip = { text: 'Stopped', bg: '#F59E0B', fg: '#1F2937' };
  else if (isIdle) {
    if (gps === 'acquiring') strip = { text: 'Acquiring GPS…', bg: '#F3F4F6', fg: '#4B5563' };
    else if (gps === 'good') strip = { text: 'GPS ready', bg: '#DCFCE7', fg: '#166534' };
    else strip = { text: `Weak GPS (±${Math.round(rec.lastFix?.acc ?? 99)} m)`, bg: '#FEF3C7', fg: '#1F2937' };
  } else {
    const suffix = gps === 'lost' ? ' · GPS SIGNAL LOST' : gps === 'weak' || gps === 'acquiring' ? ' · WEAK GPS' : '';
    strip = { text: `${cfg.label.toUpperCase()}${suffix}`, bg: suffix ? '#FEF3C7' : '#FFFFFF', fg: '#1F2937' };
  }

  // ---- Metrics (research §5: runs show avg pace; rides show current speed, avg when paused) ----
  const time = formatClock(isIdle ? 0 : timerSeconds(rec, now));
  const distance = kmValue(rec.distanceM);
  const avgSpeed = rec.movingTimeS > 0 ? rec.distanceM / rec.movingTimeS : null;
  const second =
    cfg.primaryMetric === 'speed'
      ? status === 'recording'
        ? { label: 'Speed (km/h)', value: speedValue(liveSpeed(rec, now)) }
        : { label: 'Avg speed (km/h)', value: speedValue(avgSpeed) }
      : {
          label: 'Avg pace (/km)',
          value: paceValue(rec.distanceM, rec.movingTimeS),
        };

  // Instantaneous reading for the large stats screen.
  const current = liveSpeed(rec, now);
  const currentMetric =
    cfg.primaryMetric === 'speed'
      ? { label: 'Speed now (km/h)', value: status === 'recording' ? speedValue(current) : DASH }
      : { label: 'Pace now (/km)', value: status === 'recording' && current > 0.5 ? paceValue(1000, 1000 / current) : DASH };

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
      style={{ backgroundColor: strip.bg }}
      className="min-h-[40px] justify-center px-4">
      <Text style={{ color: strip.fg }} className="text-xs font-bold text-center tracking-wide uppercase">
        {strip.text}
      </Text>
    </Pressable>
  );

  // ---- Controls -----------------------------------------------------------------------------
  const controls = isIdle ? (
    <View className="flex-row items-center justify-between">
      <Pressable
        onPress={() => setSportSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sport: ${cfg.label}. Change sport`}
        className="w-20 items-center">
        <View className="w-14 h-14 rounded-full bg-[#FFF2EB] items-center justify-center">
          <Ionicons name={cfg.icon} size={26} color="#FC4C02" />
        </View>
        <Text className="text-xs font-semibold text-gray-800 mt-1">
          {cfg.label}
        </Text>
      </Pressable>
      <Pressable
        onPress={onStart}
        disabled={starting || gps === 'denied' || gps === 'off'}
        accessibilityRole="button"
        accessibilityLabel={`Start ${cfg.label}`}
        className="w-20 h-20 rounded-full bg-[#FC4C02] items-center justify-center shadow-lg active:bg-[#E34402]">
        <Ionicons name="play" size={36} color="#FFFFFF" className="ml-1" />
      </Pressable>
      <Pressable
        onPress={() => router.push('/(tabs)/maps?source=routes')}
        accessibilityRole="button"
        accessibilityLabel="Add Route"
        className="w-20 items-center">
        <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
          <Ionicons name="git-branch-outline" size={24} color="#1F2937" />
        </View>
        <Text className="text-xs font-semibold text-gray-800 mt-1">
          Routes
        </Text>
      </Pressable>
    </View>
  ) : isPaused ? (
    <View className="flex-row items-center gap-3">
      <Button label="Resume" icon="play" size="lg" onPress={resumeRecording} className="flex-1" />
      <Button label="Finish" icon="flag" size="lg" variant="dark" onPress={onFinish} className="flex-1" />
    </View>
  ) : (
    <Button label="Pause" icon="pause" size="lg" fullWidth onPress={pauseRecording} />
  );

  const planned = usePlannedRoute();

  // ---- Stats-only view (reference 374717) ---------------------------------------------------
  if (statsView) {
    const calories = estimateCalories(sport, rec.movingTimeS, rec.distanceM);
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-white">
        <View className="flex-row items-center px-2 h-14">
          <IconButton icon="chevron-down" accessibilityLabel="Minimize recorder" onPress={() => router.back()} />
          <View className="flex-1" />
          <IconButton icon="map-outline" accessibilityLabel="Show map" onPress={() => setStatsView(false)} />
        </View>
        <View className="mx-4 rounded-xl overflow-hidden">{statusStrip}</View>
        <View className="flex-1 justify-evenly px-4">
          <MetricTile label="Time" value={time} size="display" align="center" />
          <MetricTile label={second.label} value={second.value} size="display" align="center" />
          <MetricTile label="Distance (km)" value={distance} size="display" align="center" />
          <View className="flex-row items-center mt-4">
            <MetricTile label="Moving time" value={formatClock(rec.movingTimeS)} size="L" align="center" className="flex-1" />
            <MetricTile label={currentMetric.label} value={currentMetric.value} size="L" align="center" className="flex-1" />
          </View>
          <View className="flex-row items-center mt-4">
            <MetricTile label="Elevation gain" value={formatElevation(rec.elevGainM)} size="L" align="center" className="flex-1" />
            <MetricTile label="Calories (est.)" value={calories ? String(calories) : DASH} size="L" align="center" className="flex-1" />
          </View>
        </View>
        <View style={{ paddingBottom: insets.bottom + 16 }} className="bg-white rounded-t-3xl px-4 pt-2 shadow-2xl border-t border-gray-100">{controls}</View>
        <SportSheet visible={sportSheet} selected={sport} onSelect={(s) => { setSport(s); setSportSheet(false); }} onClose={() => setSportSheet(false)} />
      </View>
    );
  }

  // ---- Map view (default) -------------------------------------------------------------------
  return (
    <View className="flex-1 bg-white">
      <MapView
        mode="live"
        route={route}
        userPosition={userPosition}
        following={following}
        onFollowingChange={setFollowing}
        padding={{ bottom: 280 }}
        plannedRoute={planned?.geometry}
      />

      <View style={{ top: insets.top + 8 }} className="absolute left-4 right-4 flex-row justify-between" pointerEvents="box-none">
        <IconButton
          icon="chevron-back"
          appearance="floating"
          accessibilityLabel={isIdle ? 'Close recorder' : 'Minimize recorder, recording continues'}
          onPress={() => router.back()}
        />
        <View className="flex-row gap-2">
          {!following ? (
            <IconButton icon="locate" appearance="floating" accessibilityLabel="Recenter on my location" onPress={() => setFollowing(true)} />
          ) : null}
          <IconButton
            icon="settings-outline"
            appearance="floating"
            accessibilityLabel="Recording Settings"
            onPress={() => router.push('/settings/gps')}
          />
        </View>
      </View>
      {planned ? (
        <View style={{ top: insets.top + 64 }} className="absolute left-4 right-4 flex-row items-center bg-white rounded-xl pl-3 shadow-lg border border-gray-100">
          <View className="w-4.5 h-1 rounded-sm bg-[#FC4C02] mr-2" />
          <Text className="text-xs font-semibold text-gray-800 flex-1" numberOfLines={1}>
            Planned: {planned.name} · {kmValue(planned.distanceM)} km · ≈{formatDuration(planned.durationS)}
          </Text>
          <IconButton icon="close" size={32} accessibilityLabel="Hide planned route" onPress={() => plannedRouteStore.set(null)} />
        </View>
      ) : null}

      <View className="absolute left-0 right-0 bottom-0" pointerEvents="box-none">
        <View className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
          <View className="flex-row items-stretch">
            <View className="flex-1">{statusStrip}</View>
            <IconButton icon="expand-outline" size={40} accessibilityLabel="Show large stats" onPress={() => setStatsView(true)} className="absolute right-0.5 top-0" />
          </View>
          <View className="flex-row py-4 px-2">
            <MetricTile label="Time" value={time} size="XL" align="center" className="flex-1" />
            <MetricTile label={second.label} value={second.value} size="XL" align="center" className="flex-1" />
            <MetricTile label="Distance (km)" value={distance} size="XL" align="center" className="flex-1" />
          </View>
        </View>
        <View style={{ paddingBottom: insets.bottom + 16 }} className="bg-white rounded-t-3xl px-4 pt-2 shadow-2xl border-t border-gray-100">
          <View className="self-center w-10 h-1 rounded bg-gray-300 mb-4" />
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
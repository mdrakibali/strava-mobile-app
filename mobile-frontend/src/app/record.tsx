import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { loadLastSport, SportSheet } from '../components/record/SportSheet';
import {
  AppText,
  BottomSheet,
  Button,
  IconButton,
  MetricTile,
  OptionRow,
} from '../design';
import { estimateCalories } from '../lib/calories';
import { DASH, formatClock, formatDuration, formatElevation, kmValue, paceValue, speedValue } from '../lib/format';
import { recordingEngine } from '../tracking/engine';
import { gpsStatus, liveSpeed, timerSeconds, useNow, useRecording } from '../tracking/useRecording';
import { plannedRouteStore, usePlannedRoute } from '../lib/plannedRoute';
import { MVP_SPORTS, sportConfig } from '../lib/sports';
import { SportType } from '../types';
import { MapStyleKey } from '../components/map/mapTypes';

/**
 * Recorder: Matches Strava's dark UI (reference: user screenshots & ScreensDesign).
 * All recording logic lives in src/tracking (engine + background task).
 * Exiting the screen never discards — discarding is only on the Save screen or confirmation modal.
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

  // Workout tab or Route start passes ?sport=…; otherwise the last-used sport is preselected.
  const requested = MVP_SPORTS.some((x) => x.id === params.sport) ? (params.sport as SportType) : null;
  const [sport, setSport] = useState<SportType>(isIdle ? (requested ?? 'Ride') : (rec.sport as SportType));
  const [sportSheet, setSportSheet] = useState(false);
  const [statsView, setStatsView] = useState(false);
  const [following, setFollowing] = useState(true);
  const [starting, setStarting] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [mapMode, setMapMode] = useState<'standard' | 'light' | 'bright' | '3d'>('standard');
  const styleKey: MapStyleKey =
    mapMode === 'light' ? 'positron' : mapMode === 'bright' ? 'bright' : 'liberty';

  const cfg = sportConfig(isIdle ? sport : rec.sport);

  // Preselect the last-used sport
  useEffect(() => {
    if (!isIdle || requested) return;
    loadLastSport().then((s) => s && setSport(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PREPARING: warm up GPS while athlete is on this screen; stop if they leave without starting.
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

  // ---- GPS Status Bar -----------------------------------------------------------------------
  let gpsLabel = 'GPS Acquired';
  let gpsColor = '#22C55E';
  let gpsBg = '#142918';
  let statusAction: (() => void) | undefined = undefined;

  if (gps === 'denied') {
    gpsLabel = 'Location access needed · Open settings';
    gpsColor = '#EF4444';
    gpsBg = '#2B1313';
    statusAction = () => Linking.openSettings();
  } else if (gps === 'off') {
    gpsLabel = 'Location is off · Turn on';
    gpsColor = '#EF4444';
    gpsBg = '#2B1313';
    statusAction = () => Linking.openSettings();
  } else if (interrupted) {
    gpsLabel = 'RECORDING WAS INTERRUPTED · Resume or finish';
    gpsColor = '#F59E0B';
    gpsBg = '#2B2010';
  } else if (isPaused) {
    gpsLabel = 'Paused';
    gpsColor = '#F59E0B';
    gpsBg = '#2B2010';
  } else if (isIdle) {
    if (gps === 'acquiring') {
      gpsLabel = 'Acquiring GPS…';
      gpsColor = '#9CA3AF';
      gpsBg = '#1C1C1E';
    } else if (gps === 'good') {
      gpsLabel = 'GPS Acquired';
      gpsColor = '#22C55E';
      gpsBg = '#142918';
    } else {
      gpsLabel = `Weak GPS (±${Math.round(rec.lastFix?.acc ?? 99)} m)`;
      gpsColor = '#F59E0B';
      gpsBg = '#2B2010';
    }
  } else {
    if (gps === 'lost') {
      gpsLabel = 'GPS SIGNAL LOST';
      gpsColor = '#EF4444';
      gpsBg = '#2B1313';
    } else if (gps === 'weak' || gps === 'acquiring') {
      gpsLabel = 'WEAK GPS SIGNAL';
      gpsColor = '#F59E0B';
      gpsBg = '#2B2010';
    } else {
      gpsLabel = 'GPS Acquired';
      gpsColor = '#22C55E';
      gpsBg = '#142918';
    }
  }

  // ---- Metrics ------------------------------------------------------------------------------
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

  // Strava "Not moving yet?" modal when distance < 50m / time < 15s
  const onFinish = () => {
    if (rec.distanceM < 50 && (rec.movingTimeS < 15 || !rec.movingTimeS)) {
      Alert.alert(
        'Not moving yet?',
        'We noticed you haven’t moved very far. Do you want to resume or finish your workout?',
        [
          { text: 'Resume', style: 'cancel', onPress: resumeRecording },
          {
            text: 'Finish & Save',
            onPress: () => router.push('/save-activity'),
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await recordingEngine.discard();
              plannedRouteStore.set(null);
              router.back();
            },
          },
        ]
      );
      return;
    }
    router.push('/save-activity');
  };

  const planned = usePlannedRoute();

  // ---- Bottom Controls Bar (Strava Dark UI) ------------------------------------------------
  const controls = isIdle ? (
    <View className="flex-row items-center justify-around py-1">
      {/* Sport Selector */}
      <Pressable
        onPress={() => setSportSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sport: ${cfg.label}. Change sport`}
        className="items-center">
        <View className="w-16 h-16 rounded-full bg-[#2A160A] border border-[#FC4C02]/40 items-center justify-center relative shadow-md active:bg-[#381D0E]">
          <Ionicons name={cfg.icon} size={28} color="#FC4C02" />
          <View className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#FC4C02] items-center justify-center border border-[#121212]">
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        </View>
        <AppText className="text-white text-xs font-bold mt-1.5">{cfg.label}</AppText>
      </Pressable>

      {/* Main Start Button */}
      <Pressable
        onPress={onStart}
        disabled={starting || gps === 'denied' || gps === 'off'}
        accessibilityRole="button"
        accessibilityLabel={`Start ${cfg.label}`}
        className="w-20 h-20 rounded-full bg-[#FC4C02] items-center justify-center shadow-2xl active:bg-[#E03A00] border-2 border-orange-400/30">
        <Ionicons name="play" size={38} color="#FFFFFF" className="ml-1" />
      </Pressable>

      {/* Switch / Add Route Button */}
      <Pressable
        onPress={() => router.push('/(tabs)/maps?source=routes')}
        accessibilityRole="button"
        accessibilityLabel="Switch Route"
        className="items-center">
        <View
          className={`w-16 h-16 rounded-full items-center justify-center relative shadow-md active:bg-neutral-800 ${
            planned
              ? 'bg-[#2A160A] border border-[#FC4C02]/40'
              : 'bg-neutral-800 border border-neutral-700'
          }`}>
          <Ionicons
            name="git-network-outline"
            size={26}
            color={planned ? '#FC4C02' : '#FFFFFF'}
          />
          {planned ? (
            <View className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#FC4C02] items-center justify-center border border-[#121212]">
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <AppText className="text-white text-xs font-bold mt-1.5">
          {planned ? 'Switch Route' : 'Routes'}
        </AppText>
      </Pressable>
    </View>
  ) : isPaused ? (
    <View className="flex-row items-center gap-3 py-1">
      <Pressable
        onPress={resumeRecording}
        className="flex-1 h-14 rounded-2xl bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
        <Ionicons name="play" size={24} color="#FFFFFF" />
        <AppText className="text-white text-base font-black ml-2">Resume</AppText>
      </Pressable>
      <Pressable
        onPress={onFinish}
        className="flex-1 h-14 rounded-2xl bg-[#242426] border border-neutral-700 flex-row items-center justify-center shadow-lg active:bg-neutral-800">
        <Ionicons name="flag-outline" size={22} color="#FFFFFF" />
        <AppText className="text-white text-base font-black ml-2">Finish</AppText>
      </Pressable>
    </View>
  ) : (
    <View className="items-center py-1">
      <Pressable
        onPress={pauseRecording}
        accessibilityRole="button"
        accessibilityLabel="Pause recording"
        className="w-20 h-20 rounded-full bg-[#FC4C02] items-center justify-center shadow-2xl active:bg-[#E03A00] border-2 border-orange-400/30">
        <Ionicons name="pause" size={34} color="#FFFFFF" />
      </Pressable>
      <AppText className="text-neutral-400 text-xs font-bold mt-1.5">Tap to pause</AppText>
    </View>
  );

  // ---- Stats-only Fullscreen View -----------------------------------------------------------
  if (statsView) {
    const calories = estimateCalories(sport, rec.movingTimeS, rec.distanceM);
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#121212]">
        <View className="flex-row items-center px-3 h-14 justify-between border-b border-neutral-800">
          <IconButton icon="chevron-down" appearance="floating" accessibilityLabel="Minimize recorder" onPress={() => router.back()} />
          <AppText className="text-white text-base font-black uppercase tracking-wider">{cfg.label}</AppText>
          <IconButton icon="map-outline" appearance="floating" accessibilityLabel="Show map" onPress={() => setStatsView(false)} />
        </View>

        {/* GPS status banner */}
        <Pressable
          onPress={statusAction}
          disabled={!statusAction}
          style={{ backgroundColor: gpsBg }}
          className="mx-4 mt-3 py-2 px-4 rounded-xl flex-row items-center justify-center border border-neutral-800">
          <Ionicons name="cellular" size={14} color={gpsColor} />
          <Text style={{ color: gpsColor }} className="text-xs font-black uppercase tracking-wider ml-1.5">
            {gpsLabel}
          </Text>
        </Pressable>

        <View className="flex-1 justify-evenly px-5">
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

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }} className="bg-[#1C1C1E] rounded-t-3xl px-5 pt-3 border-t border-neutral-800 shadow-2xl">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-700 mb-3" />
          {controls}
        </View>
        <SportSheet visible={sportSheet} selected={sport} onSelect={(s) => { setSport(s); setSportSheet(false); }} onClose={() => setSportSheet(false)} />
      </View>
    );
  }

  // ---- Map View (Strava Default) ------------------------------------------------------------
  return (
    <View className="flex-1 bg-[#121212]">
      {/* MapLibre Map with user heading puck */}
      <MapView
        mode="live"
        route={route}
        userPosition={userPosition}
        following={following}
        onFollowingChange={setFollowing}
        padding={{ bottom: 310 }}
        plannedRoute={planned?.geometry}
        styleKey={styleKey}
        pitch={pitch}
        showUserLocation
      />

      {/* Top Header: Minimize, Heatmap pill, and Settings */}
      <View style={{ top: insets.top + 8 }} className="absolute left-4 right-4 flex-row items-center justify-between z-20" pointerEvents="box-none">
        <IconButton
          icon="chevron-back"
          appearance="floating"
          accessibilityLabel={isIdle ? 'Close recorder' : 'Minimize recorder, recording continues'}
          onPress={() => router.back()}
        />

        {/* Strava "See what's popular" Heatmap pill banner */}
        <Pressable
          onPress={() => router.push('/(tabs)/maps?source=routes')}
          className="flex-row items-center bg-[#1C1C1EE6] px-3 py-1.5 rounded-full border border-neutral-700 shadow-xl active:bg-neutral-800">
          <View className="w-5 h-5 rounded-full bg-[#FC4C02] items-center justify-center mr-1.5 shadow-sm">
            <Ionicons name="flame" size={12} color="#FFFFFF" />
          </View>
          <View>
            <AppText className="text-white text-[11px] font-black">See what's popular</AppText>
            <AppText className="text-neutral-400 text-[9px]">Tap to add weekly Heatmap</AppText>
          </View>
        </Pressable>

        <IconButton
          icon="settings-outline"
          appearance="floating"
          accessibilityLabel="Recording Settings"
          onPress={() => router.push('/settings/gps')}
        />
      </View>

      {/* Right Side Map Tools: Layers, 3D, and Recenter */}
      <View style={{ top: insets.top + 72 }} className="absolute right-4 items-center gap-2.5 z-20">
        <Pressable
          onPress={() => setStyleModalVisible(true)}
          className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-700/80 items-center justify-center shadow-lg active:bg-neutral-800">
          <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => setPitch((p) => (p === 0 ? 55 : 0))}
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-lg active:bg-neutral-800 ${
            pitch > 0 ? 'bg-[#FC4C02] border-[#FC4C02]' : 'bg-neutral-900/90 border-neutral-700/80'
          }`}>
          <AppText className="text-white text-xs font-black">3D</AppText>
        </Pressable>

        <Pressable
          onPress={() => setFollowing(true)}
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-lg active:bg-neutral-800 ${
            following ? 'bg-[#1C1C1E] border-neutral-700/80' : 'bg-[#FC4C02] border-[#FC4C02]'
          }`}>
          <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Planned route active banner */}
      {planned ? (
        <View style={{ top: insets.top + 64 }} className="absolute left-4 right-16 flex-row items-center bg-[#1C1C1EE6] rounded-2xl pl-3 pr-2 py-2 border border-neutral-800 shadow-xl z-10">
          <View className="w-3.5 h-3.5 rounded-full bg-[#FC4C02] mr-2 items-center justify-center">
            <Ionicons name="git-branch" size={9} color="#FFFFFF" />
          </View>
          <AppText className="text-white text-xs font-bold flex-1" numberOfLines={1}>
            Following: {planned.name} · {kmValue(planned.distanceM)} km
          </AppText>
          <Pressable onPress={() => plannedRouteStore.set(null)} hitSlop={8} className="p-1">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      ) : null}

      {/* Bottom Floating Stats HUD + Strava Controls Container */}
      <View className="absolute left-0 right-0 bottom-0 z-20" pointerEvents="box-none">
        {/* Floating Stats Card (Strava reference) */}
        <View className="mx-4 mb-2.5 bg-[#1C1C1EE6] rounded-3xl overflow-hidden shadow-2xl border border-neutral-800">
          {/* Top GPS Status Row */}
          <Pressable
            onPress={statusAction}
            disabled={!statusAction}
            style={{ backgroundColor: gpsBg }}
            className="flex-row items-center justify-between px-3.5 py-2 border-b border-neutral-800">
            <View className="flex-row items-center">
              <Ionicons name="cellular" size={13} color={gpsColor} />
              <AppText style={{ color: gpsColor }} className="text-xs font-black uppercase tracking-wider ml-1.5">
                {gpsLabel}
              </AppText>
            </View>
            <Pressable onPress={() => setStatsView(true)} hitSlop={10}>
              <Ionicons name="expand-outline" size={16} color="#9CA3AF" />
            </Pressable>
          </Pressable>

          {/* 3 Metric Columns: Time, Speed/Pace, Distance */}
          <View className="flex-row py-3.5 px-3 justify-around items-center">
            <View className="items-center flex-1">
              <AppText className="text-white text-2xl font-black">{time}</AppText>
              <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">Time</AppText>
            </View>
            <View className="w-[1px] h-8 bg-neutral-800" />
            <View className="items-center flex-1">
              <AppText className="text-white text-2xl font-black">{second.value}</AppText>
              <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider mt-0.5" numberOfLines={1}>{second.label}</AppText>
            </View>
            <View className="w-[1px] h-8 bg-neutral-800" />
            <View className="items-center flex-1">
              <AppText className="text-white text-2xl font-black">{distance}</AppText>
              <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">Distance (km)</AppText>
            </View>
          </View>
        </View>

        {/* Bottom Navigation-aware Controls Container (never cut off) */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          className="bg-[#121212] rounded-t-[32px] px-5 pt-3 border-t border-neutral-800 shadow-2xl">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-700 mb-3" />
          {controls}
        </View>
      </View>

      {/* Sport Selector Bottom Sheet */}
      <SportSheet
        visible={sportSheet}
        selected={sport}
        onSelect={(s) => {
          setSport(s);
          setSportSheet(false);
        }}
        onClose={() => setSportSheet(false)}
      />

      {/* Map Style Selector Bottom Sheet */}
      <BottomSheet visible={styleModalVisible} onClose={() => setStyleModalVisible(false)} title="Map style">
        {(
          [
            ['standard', 'Standard', 'Streets, parks, water and paths', 'map-outline'],
            ['light', 'Light', 'Muted map so routes stand out', 'sunny-outline'],
            ['bright', 'Bright', 'High-contrast street map', 'contrast-outline'],
            ['3d', '3D buildings', 'Tilted view with OpenStreetMap building heights', 'cube-outline'],
          ] as const
        ).map(([id, title, description, icon]) => (
          <OptionRow
            key={id}
            title={title}
            description={description}
            icon={icon}
            selected={mapMode === id}
            onPress={() => {
              setMapMode(id);
              if (id === '3d') setPitch(55);
              else setPitch(0);
              setStyleModalVisible(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

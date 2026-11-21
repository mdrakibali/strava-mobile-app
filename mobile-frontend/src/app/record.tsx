import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { DEFAULT_MAP_STYLE, MAP_STYLE_OPTIONS, MapStyleKey } from '../components/map/mapTypes';
import { RecordBottomControls } from '../components/record/RecordBottomControls';
import { RecordHeaderControls } from '../components/record/RecordHeaderControls';
import { RecordIndoorView } from '../components/record/RecordIndoorView';
import { RecordOutdoorHud } from '../components/record/RecordOutdoorHud';
import { RecordStatsFullscreen } from '../components/record/RecordStatsFullscreen';
import { loadLastSport, SportSheet } from '../components/record/SportSheet';
import { useRecordMetrics } from '../components/record/useRecordMetrics';
import { BottomSheet, OptionRow } from '../design';
import { estimateCalories, estimateIndoorCalories } from '../lib/calories';
import { usePlannedRoute } from '../lib/plannedRoute';
import { MVP_SPORTS, sportConfig } from '../lib/sports';
import { recordingEngine } from '../tracking/engine';
import { gpsStatus, useNow, useRecording } from '../tracking/useRecording';
import { SportType } from '../types';

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sport?: string; autoStart?: string }>();
  const rec = useRecording();
  const status = rec.lifecycle.status;
  const isIdle = status === 'idle' || status === 'preparing';
  const now = useNow(true);

  const requested = MVP_SPORTS.some((x) => x.id === params.sport) || params.sport === 'Workout'
    ? (params.sport as SportType)
    : null;
  const [sport, setSport] = useState<SportType>(isIdle ? (requested ?? 'Run') : (rec.sport as SportType));
  const [sportSheet, setSportSheet] = useState(false);
  const [statsView, setStatsView] = useState(false);
  const [following, setFollowing] = useState(true);
  const [starting, setStarting] = useState(false);
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [mapMode, setMapMode] = useState<MapStyleKey>(DEFAULT_MAP_STYLE);

  const cfg = sportConfig(isIdle ? sport : rec.sport);
  const isIndoor = sport === 'Workout' || sport === 'Yoga';

  const autoStartRan = useRef(false);

  useEffect(() => {
    if (!isIdle || requested) return;
    loadLastSport().then((s) => s && setSport(s));
  }, [isIdle, requested]);

  useEffect(() => {
    if (params.autoStart === 'true' && isIdle && !autoStartRan.current) {
      autoStartRan.current = true;
      recordingEngine.start(sport).catch(() => {});
    }
  }, [params.autoStart, isIdle, sport]);

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

  const {
    gpsLabel, gpsColor, gpsBg, statusAction,
    time, distance, second, currentMetric, onStart, onFinish,
  } = useRecordMetrics({ rec, now, sport, cfg, status, isIdle, gps, setFollowing, setStarting });

  const planned = usePlannedRoute();

  const handleBack = () => {
    if (status === 'recording' || status === 'paused') {
      Alert.alert(
        'Leave Recording?',
        'Your activity continues in the background. Return anytime from the home banner.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave (Keep Recording)',
            onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
          },
        ]
      );
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    }
  };

  if (isIndoor) {
    const indoorCal = estimateIndoorCalories(sport, rec.movingTimeS);
    return (
      <RecordIndoorView
        status={status} time={time} sportLabel={cfg.label} calories={indoorCal}
        heartRate={null} onBack={handleBack} onSettings={() => router.push('/settings/gps')}
        onStart={onStart} onPause={() => recordingEngine.pause()}
        onResume={() => recordingEngine.resume()} onFinish={onFinish}
      />
    );
  }

  if (statsView) {
    const calories = estimateCalories(sport, rec.movingTimeS, rec.distanceM);
    return (
      <RecordStatsFullscreen
        sportConfig={cfg} time={time} secondLabel={second.label} secondValue={second.value}
        distance={distance} movingTimeS={rec.movingTimeS} currentLabel={currentMetric.label}
        currentValue={currentMetric.value} elevGainM={rec.elevGainM} calories={calories}
        gpsLabel={gpsLabel} gpsColor={gpsColor} gpsBg={gpsBg} status={status} starting={starting}
        gpsDisabled={gps === 'denied' || gps === 'off'} hasPlannedRoute={Boolean(planned)}
        onClose={() => setStatsView(false)} onOpenSportSheet={() => setSportSheet(true)}
        onStart={onStart} onPause={() => recordingEngine.pause()}
        onResume={() => recordingEngine.resume()} onFinish={onFinish}
        onOpenRoutes={() => router.push('/(tabs)/maps?source=routes')} onStatusAction={statusAction}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <MapView
        mode="live"
        route={route}
        userPosition={userPosition}
        following={following}
        onFollowingChange={setFollowing}
        padding={{ bottom: 310 }}
        plannedRoute={planned?.geometry}
        styleKey={mapMode}
        showUserLocation
      />

      <RecordHeaderControls
        topInset={insets.top}
        isIdle={isIdle}
        following={following}
        onBack={handleBack}
        onOpenHeatmap={() => router.push('/(tabs)/maps?source=routes')}
        onOpenSettings={() => router.push('/settings/gps')}
        onOpenLayers={() => setStyleModalVisible(true)}
        onRecenter={() => setFollowing(true)}
      />

      {/* Bottom Floating Telemetry HUD + Controls */}
      <View className="absolute left-0 right-0 bottom-0 z-20" pointerEvents="box-none">
        <RecordOutdoorHud
          status={status}
          sportLabel={cfg.label}
          gpsLabel={gpsLabel}
          gpsColor={gpsColor}
          gpsBg={gpsBg}
          time={time}
          secondLabel={second.label}
          secondValue={second.value}
          distance={distance}
          onExpandPress={() => setStatsView(true)}
          onStatusAction={statusAction}
        />

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          className="bg-white rounded-t-3xl px-5 pt-2 border-t border-gray-100 shadow-2xl">
          <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-3" />
          <RecordBottomControls
            status={status}
            sportConfig={cfg}
            starting={starting}
            gpsDisabled={gps === 'denied' || gps === 'off'}
            hasPlannedRoute={Boolean(planned)}
            onOpenSportSheet={() => setSportSheet(true)}
            onStart={onStart}
            onPause={() => recordingEngine.pause()}
            onResume={() => recordingEngine.resume()}
            onFinish={onFinish}
            onOpenRoutes={() => router.push('/(tabs)/maps?source=routes')}
          />
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

      <BottomSheet visible={styleModalVisible} onClose={() => setStyleModalVisible(false)} title="Map style">
        {MAP_STYLE_OPTIONS.map(({ id, title, description: desc, icon }) => (
          <OptionRow
            key={id}
            title={title}
            description={desc}
            icon={icon}
            selected={mapMode === id}
            onPress={() => {
              setMapMode(id);
              setStyleModalVisible(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

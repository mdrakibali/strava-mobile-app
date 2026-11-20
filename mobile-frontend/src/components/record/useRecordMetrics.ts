import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';
import { DASH, formatClock, kmValue, paceValue, speedValue } from '../../lib/format';
import { plannedRouteStore } from '../../lib/plannedRoute';
import { SportConfig } from '../../lib/sports';
import { recordingEngine } from '../../tracking/engine';
import { liveSpeed, timerSeconds } from '../../tracking/useRecording';
import { SportType } from '../../types';

interface UseRecordMetricsParams {
  rec: any;
  now: number;
  sport: SportType;
  cfg: SportConfig;
  status: string;
  isIdle: boolean;
  gps: string;
  setFollowing: (f: boolean) => void;
  setStarting: (s: boolean) => void;
}

export function useRecordMetrics({
  rec,
  now,
  sport,
  cfg,
  status,
  isIdle,
  gps,
  setFollowing,
  setStarting,
}: UseRecordMetricsParams) {
  const router = useRouter();

  let gpsLabel = 'GPS Acquired';
  let gpsColor = '#16A34A';
  let gpsBg = '#F0FDF4';
  let statusAction: (() => void) | undefined;

  if (gps === 'denied' || gps === 'off') {
    gpsLabel = 'Location access needed · Settings';
    gpsColor = '#DC2626';
    gpsBg = '#FEF2F2';
    statusAction = () => Linking.openSettings();
  } else if (status === 'paused') {
    gpsLabel = 'Paused';
    gpsColor = '#D97706';
    gpsBg = '#FFFBEB';
  } else if (isIdle && gps === 'acquiring') {
    gpsLabel = 'Acquiring GPS…';
    gpsColor = '#6B7280';
    gpsBg = '#F3F4F6';
  }

  const time = formatClock(isIdle ? 0 : timerSeconds(rec, now));
  const distance = kmValue(rec.distanceM);
  const avgSpeed = rec.movingTimeS > 0 ? rec.distanceM / rec.movingTimeS : null;
  const second =
    cfg.primaryMetric === 'speed'
      ? { label: 'Speed (km/h)', value: speedValue(status === 'recording' ? liveSpeed(rec, now) : avgSpeed) }
      : { label: 'Avg pace (/km)', value: paceValue(rec.distanceM, rec.movingTimeS) };

  const current = liveSpeed(rec, now);
  const currentMetric =
    cfg.primaryMetric === 'speed'
      ? { label: 'Speed now', value: status === 'recording' ? speedValue(current) : DASH }
      : { label: 'Pace now', value: status === 'recording' && current > 0.5 ? paceValue(1000, 1000 / current) : DASH };

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

  const onFinish = () => {
    if (rec.distanceM < 50 && (rec.movingTimeS < 15 || !rec.movingTimeS)) {
      Alert.alert('Short Workout', 'We noticed you haven’t moved very far. Resume, finish or discard?', [
        { text: 'Resume', style: 'cancel', onPress: () => recordingEngine.resume() },
        { text: 'Finish & Save', onPress: () => router.push('/save-activity') },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await recordingEngine.discard();
            plannedRouteStore.set(null);
            router.back();
          },
        },
      ]);
      return;
    }
    router.push('/save-activity');
  };

  return {
    gpsLabel,
    gpsColor,
    gpsBg,
    statusAction,
    time,
    distance,
    second,
    currentMetric,
    onStart,
    onFinish,
  };
}

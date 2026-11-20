import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveLastSport } from '../../components/record/SportSheet';
import { useApp } from '../../context/AppContext';
import { AppBar, AppText, Button, Chip, ChipRow, color, radius, SectionTitle, space } from '../../design';
import { formatClock, formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { PLACE_LABEL, useNearbyPlaces } from '../../lib/useNearbyPlaces';
import { api } from '../../services/api';
import { syncWorker } from '../../tracking/sync';
import { isRecordingActive, timerSeconds, useNow, usePendingUploads, useRecording } from '../../tracking/useRecording';
import { SportType } from '../../types';

type Totals = Record<string, { count: number; distance: number; moving: number }>;

/**
 * Workout tab (reference: strava-screen/workout-tab.png). One card per supported sport with a
 * Start button that opens the single recorder (src/tracking engine) preset to that sport.
 * Also surfaces an in-progress recording and uploads that are still waiting.
 */
export default function WorkoutTab() {
  const router = useRouter();
  const { currentUser } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const now = useNow(active && rec.lifecycle.status === 'recording');
  const pending = usePendingUploads();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [placeSport, setPlaceSport] = useState<SportType>('Run');
  const nearby = useNearbyPlaces(placeSport);

  // This year's totals per sport, from the server (policy-aware stats endpoint).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.athletes.stats(currentUser.id).then(
        (s) => {
          if (cancelled) return;
          const t: Totals = {};
          for (const b of s.bySport) t[b.sportType] = { count: b.yearToDate.count, distance: b.yearToDate.distanceMeters, moving: b.yearToDate.movingTimeSeconds };
          setTotals(t);
        },
        () => !cancelled && setTotals(null)
      );
      return () => {
        cancelled = true;
      };
    }, [currentUser.id])
  );

  const start = (sport: SportType) => {
    saveLastSport(sport);
    router.push({ pathname: '/record', params: { sport } });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppBar title="Workout" large leading="none" />
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl }}>
        {active ? (
          <Pressable
            onPress={() => router.push('/record')}
            accessibilityRole="button"
            style={[styles.card, styles.activeCard, rec.lifecycle.status === 'paused' && { borderColor: color.warning }]}>
            <Ionicons name={rec.lifecycle.status === 'paused' ? 'pause-circle' : 'radio-button-on'} size={28} color={color.brand} />
            <View style={{ flex: 1, marginLeft: space.md }}>
              <AppText variant="title3">
                {rec.lifecycle.pauseReason === 'interrupted'
                  ? 'Recording interrupted'
                  : rec.lifecycle.status === 'paused'
                    ? `${sportConfig(rec.sport).label} paused`
                    : `${sportConfig(rec.sport).label} in progress`}
              </AppText>
              <AppText variant="label" color="inkSecondary">
                {formatClock(timerSeconds(rec, now))} · {kmValue(rec.distanceM)} km · tap to open
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={color.inkTertiary} />
          </Pressable>
        ) : null}

        {pending.length > 0 ? (
          <Pressable onPress={() => syncWorker.kick(true)} accessibilityRole="button" style={[styles.card, styles.activeCard]}>
            <Ionicons name="cloud-upload-outline" size={26} color={color.ink} />
            <View style={{ flex: 1, marginLeft: space.md }}>
              <AppText variant="bodyStrong">
                {pending.length} {pending.length === 1 ? 'activity' : 'activities'} waiting to upload
              </AppText>
              <AppText variant="label" color="inkSecondary">Tap to retry now</AppText>
            </View>
          </Pressable>
        ) : null}

        {MVP_SPORTS.map((s) => {
          const t = totals?.[s.id];
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Ionicons name={s.icon} size={26} color={color.ink} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <AppText variant="title2">{s.label}</AppText>
                  <AppText variant="label" color="inkSecondary">
                    {t && t.count > 0
                      ? `This year: ${t.count} · ${kmValue(t.distance)} km · ${formatDuration(t.moving)}`
                      : s.primaryMetric === 'speed'
                        ? 'GPS · speed, distance, elevation'
                        : 'GPS · pace, distance, elevation'}
                  </AppText>
                </View>
              </View>
              <Button
                label={active ? 'Recording in progress' : `Start ${s.label}`}
                icon="play"
                size="lg"
                fullWidth
                disabled={active}
                onPress={() => start(s.id)}
                style={{ marginTop: space.lg }}
              />
            </View>
          );
        })}

        {/* Real OpenStreetMap places around the athlete's actual GPS position (GET /places/nearby). */}
        <SectionTitle title="Places near you" style={{ marginTop: space.md }} />
        <ChipRow>
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={placeSport === s.id} onPress={() => setPlaceSport(s.id)} />
          ))}
        </ChipRow>
        <View style={[styles.card, { marginTop: space.sm }]}>
          {nearby.state.status === 'ready' ? (
            nearby.state.places.length === 0 ? (
              <AppText variant="body" color="inkSecondary">
                No {sportConfig(placeSport).label.toLowerCase()} places are mapped in OpenStreetMap within 5 km of you.
              </AppText>
            ) : (
              <>
                {nearby.state.places.slice(0, 3).map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.navigate({ pathname: '/maps', params: { source: 'nearby', sport: placeSport, place: p.id } })}
                    accessibilityRole="button"
                    style={styles.placeRow}>
                    <Ionicons name={(PLACE_LABEL[p.category]?.icon ?? 'location-outline') as any} size={20} color={color.brandText} />
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>{p.name}</AppText>
                      <AppText variant="label" color="inkSecondary">
                        {PLACE_LABEL[p.category]?.label ?? 'Place'} · {p.distanceM < 1000 ? `${p.distanceM} m` : `${kmValue(p.distanceM)} km`} away
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={color.inkTertiary} />
                  </Pressable>
                ))}
                <AppText variant="caption" color="inkTertiary" style={{ marginTop: space.xs }}>{nearby.state.attribution}</AppText>
              </>
            )
          ) : nearby.state.status === 'permission_denied' ? (
            <>
              <AppText variant="body" color="inkSecondary">Allow location to see parks, tracks and trails near you.</AppText>
              <Button label="Allow location" size="sm" style={{ marginTop: space.sm, alignSelf: 'flex-start' }} onPress={nearby.retry} />
            </>
          ) : nearby.state.status === 'location_off' ? (
            <AppText variant="body" color="inkSecondary">Turn on location to see places near you.</AppText>
          ) : nearby.state.status === 'no_fix' || nearby.state.status === 'error' ? (
            <>
              <AppText variant="body" color="inkSecondary">
                {nearby.state.status === 'no_fix' ? 'Couldn’t get a GPS fix.' : nearby.state.message}
              </AppText>
              <Button label="Retry" size="sm" variant="outline" style={{ marginTop: space.sm, alignSelf: 'flex-start' }} onPress={nearby.retry} />
            </>
          ) : (
            <AppText variant="body" color="inkSecondary">
              {nearby.state.status === 'locating' ? 'Finding your location…' : 'Searching nearby…'}
            </AppText>
          )}
        </View>

        <Button
          label="Activity history"
          variant="outline"
          size="lg"
          fullWidth
          icon="time-outline"
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId: currentUser.id } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.gutter,
    marginBottom: space.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  placeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  activeCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: color.brand },
});

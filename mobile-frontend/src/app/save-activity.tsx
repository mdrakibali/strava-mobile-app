import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VISIBILITY_LABEL } from '../components/activity/FeedCard';
import { RoutePreview } from '../components/map/RoutePreview';
import { SportSheet } from '../components/record/SportSheet';
import { useApp } from '../context/AppContext';
import {
  AppText,
  BottomSheet,
  Button,
  color,
  EmptyState,
  ErrorState,
  MetricRow,
  MetricTile,
  OptionRow,
  radius,
  SectionTitle,
  SelectField,
  space,
  TextField,
} from '../design';
import { LngLat } from '../lib/activityView';
import {
  defaultActivityTitle,
  formatDuration,
  formatElevation,
  kmValue,
  paceValue,
  speedValue,
} from '../lib/format';
import { sportConfig } from '../lib/sports';
import { ActivityVisibility, SportType } from '../types';

const VISIBILITY_OPTIONS: { id: ActivityVisibility; title: string; description: string }[] = [
  { id: 'PUBLIC', title: 'Everyone', description: 'Anyone can view this activity.' },
  { id: 'FOLLOWERS_ONLY', title: 'Followers', description: 'Only people who follow you can view this activity.' },
  { id: 'ONLY_ME', title: 'Only you', description: 'Private. Only you can view this activity.' },
];

/**
 * Save Activity (reference: ScreensDesign 374734 / 374750 / 374747; research §3).
 * Only fields the backend actually stores are shown (UI/UX audit: no fake controls).
 */
export default function SaveActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRecording: rec, saveNewActivity, discardRecording, resumeRecording } = useApp();

  const [startDate] = useState(() => new Date(rec.startedAt ?? Date.now()));
  const [sport, setSport] = useState<SportType>(rec.sportType);
  const [title, setTitle] = useState(() => defaultActivityTitle(sportConfig(rec.sportType).label, startDate));
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ActivityVisibility>('PUBLIC');
  const [sportSheet, setSportSheet] = useState(false);
  const [visibilitySheet, setVisibilitySheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = sportConfig(sport);
  const route = useMemo<LngLat[]>(
    () => rec.routeCoordinates.map((p) => [p.longitude, p.latitude] as LngLat),
    [rec.routeCoordinates]
  );

  if (!rec.isRecording) {
    return (
      <SafeAreaView style={styles.screen}>
        <EmptyState
          icon="checkmark-done-outline"
          title="Nothing to save"
          body="There is no recorded activity waiting to be saved."
          primary={{ label: 'Close', onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  const onResume = () => {
    resumeRecording();
    router.back();
  };

  const onDiscard = () =>
    Alert.alert('Discard activity?', 'This recording will be deleted. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardRecording();
          router.dismissAll();
        },
      },
    ]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const id = await saveNewActivity({ title, description, sportType: sport, visibility });
      router.dismissAll();
      router.push({ pathname: '/activity/[id]', params: { id } });
      discardRecording(); // only after the server confirmed the upload
    } catch (e: any) {
      setError(
        `${e?.message || 'Upload failed.'} Your activity is still here — check your connection and tap Save again.`
      );
      setSaving(false);
    }
  };

  const second =
    cfg.primaryMetric === 'speed'
      ? { label: 'Avg speed', value: speedValue(rec.averageSpeedMps), unit: 'km/h' }
      : { label: 'Avg pace', value: paceValue(rec.distanceMeters, rec.movingSeconds), unit: '/km' };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Button label="Resume" variant="outline" size="sm" onPress={onResume} disabled={saving} />
        <AppText variant="title2" accessibilityRole="header" style={styles.headerTitle}>
          Save Activity
        </AppText>
        <View style={{ width: 88 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.summary}>
            <MetricRow>
              <MetricTile label="Distance" value={kmValue(rec.distanceMeters)} unit="km" />
              <MetricTile label="Moving time" value={formatDuration(rec.movingSeconds)} />
              <MetricTile label={second.label} value={second.value} unit={second.value === '–' ? undefined : second.unit} />
              <MetricTile label="Elev gain" value={formatElevation(rec.elevationGainMeters)} />
            </MetricRow>
          </View>
          {route.length > 1 ? (
            <View style={styles.preview}>
              <RoutePreview route={route} height={150} rounded />
            </View>
          ) : null}

          <TextField
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleEdited(true);
            }}
            placeholder="Title your activity"
            accessibilityLabel="Activity title"
            maxLength={100}
            returnKeyType="next"
          />
          <View style={{ height: space.md }} />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder="How did it go? Share more about your activity."
            accessibilityLabel="Description"
            multiline
            maxLength={2000}
          />
          <View style={{ height: space.md }} />
          <SelectField value={cfg.label} icon={cfg.icon} onPress={() => setSportSheet(true)} accessibilityLabel="Sport" />

          <SectionTitle title="Visibility" style={{ marginTop: space.xxl }} />
          <AppText variant="label" color="inkSecondary" style={{ marginBottom: space.sm }}>
            Who can view
          </AppText>
          <SelectField
            value={VISIBILITY_LABEL[visibility].label}
            icon={VISIBILITY_LABEL[visibility].icon}
            onPress={() => setVisibilitySheet(true)}
            accessibilityLabel="Who can view"
          />

          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}

          <Button
            label="Discard Activity"
            variant="danger"
            onPress={onDiscard}
            disabled={saving}
            style={{ alignSelf: 'center', marginTop: space.xxl }}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button
            label={error ? 'Try again' : 'Save Activity'}
            size="lg"
            fullWidth
            loading={saving}
            onPress={onSave}
            disabled={!title.trim()}
          />
        </View>
      </KeyboardAvoidingView>

      <SportSheet
        visible={sportSheet}
        selected={sport}
        onSelect={(s) => {
          setSport(s);
          if (!titleEdited) setTitle(defaultActivityTitle(sportConfig(s).label, startDate));
          setSportSheet(false);
        }}
        onClose={() => setSportSheet(false)}
      />
      <BottomSheet visible={visibilitySheet} onClose={() => setVisibilitySheet(false)} title="Who can view">
        {VISIBILITY_OPTIONS.map((o) => (
          <OptionRow
            key={o.id}
            title={o.title}
            description={o.description}
            icon={VISIBILITY_LABEL[o.id].icon}
            selected={visibility === o.id}
            onPress={() => {
              setVisibility(o.id);
              setVisibilitySheet(false);
            }}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { padding: space.gutter, paddingBottom: space.xxxl },
  summary: {
    padding: space.lg,
    backgroundColor: color.canvas,
    borderRadius: radius.md,
    marginBottom: space.md,
  },
  preview: { marginBottom: space.lg },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
});

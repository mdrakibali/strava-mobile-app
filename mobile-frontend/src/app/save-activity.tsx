import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SaveActivityForm } from '../components/activity/SaveActivityForm';
import { VISIBILITY_LABEL } from '../components/activity/FeedCard';
import { SportSheet } from '../components/record/SportSheet';
import { BottomSheet, EmptyState, ErrorState, OptionRow } from '../design';
import { defaultActivityTitle, paceValue, speedValue } from '../lib/format';
import { plannedRouteStore } from '../lib/plannedRoute';
import { noMovementReason } from '../lib/saveGuard';
import { sportConfig } from '../lib/sports';
import { recordingEngine } from '../tracking/engine';
import { TrackSummary } from '../tracking/shared';
import { syncWorker } from '../tracking/sync';
import { useRecording } from '../tracking/useRecording';
import { ActivityVisibility, SportType } from '../types';

const VISIBILITY_OPTIONS: { id: ActivityVisibility; title: string; description: string }[] = [
  { id: 'PUBLIC', title: 'Everyone', description: 'Anyone on Kinetix can see this activity.' },
  {
    id: 'FOLLOWERS_ONLY',
    title: 'Followers',
    description: 'Only people who follow you can view this activity.',
  },
  { id: 'ONLY_ME', title: 'Only you', description: 'Private. Only you can view this activity.' },
];

export default function SaveActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rec = useRecording();
  const active =
    rec.lifecycle.status === 'recording' ||
    rec.lifecycle.status === 'paused' ||
    Boolean(rec.sessionId);

  const [startDate] = useState(() => new Date(rec.lifecycle.startedAt ?? Date.now()));
  const [sport, setSport] = useState<SportType>((rec.sport as SportType) || 'Run');
  const [title, setTitle] = useState(() =>
    defaultActivityTitle(sportConfig(rec.sport).label, startDate)
  );
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ActivityVisibility>('PUBLIC');
  const [sportSheet, setSportSheet] = useState(false);
  const [visibilitySheet, setVisibilitySheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TrackSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    recordingEngine.previewSummary().then((s) => !cancelled && setSummary(s));
    return () => {
      cancelled = true;
    };
  }, [rec.distanceM]);

  const cfg = sportConfig(sport);
  const route = rec.route;

  if (!active && !saving) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="checkmark-done-outline"
          title="Nothing to save"
          body="There is no recorded activity waiting to be saved."
          primary={{ label: 'Close', onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  const onResume = async () => {
    await recordingEngine.resume();
    router.replace({ pathname: '/record', params: { sport } });
  };

  const onDiscard = () =>
    Alert.alert('Discard activity?', 'This recording will be deleted. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await recordingEngine.discard();
          plannedRouteStore.set(null);
          router.replace('/(tabs)/workout');
        },
      },
    ]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    let sessionId: string;
    try {
      sessionId = await recordingEngine.complete({
        title: title.trim(),
        description: description.trim(),
        sportType: sport,
        visibility,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the activity.');
      setSaving(false);
      return;
    }
    plannedRouteStore.set(null);
    const { synced, activityId } = await syncWorker.waitFor(sessionId, 8000);
    if (synced && activityId) {
      router.replace({ pathname: '/activity/[id]', params: { id: activityId } });
    } else {
      router.replace('/(tabs)/workout');
      if (!synced) {
        Alert.alert(
          'Saved on this phone',
          'Your activity will upload automatically when the connection is back.'
        );
      }
    }
  };

  const s = summary;
  const distanceM = s?.distanceM ?? rec.distanceM;
  const movingS = s?.movingTimeS ?? rec.movingTimeS;
  // Only judge once the summary has loaded, so a brief empty state can't flash the warning.
  const blocked = s ? noMovementReason(sport, distanceM, movingS) : null;
  const second =
    cfg.primaryMetric === 'speed'
      ? {
          label: 'Avg speed',
          value: speedValue(movingS > 0 ? distanceM / movingS : null),
          unit: 'km/h',
        }
      : { label: 'Avg pace', value: paceValue(distanceM, movingS), unit: '/km' };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className="flex-1 bg-white">
      {/* Top Header */}
      <View className="h-14 flex-row items-center px-4 border-b border-gray-100 justify-between">
        <Pressable
          onPress={onResume}
          disabled={saving}
          className="px-3.5 py-1.5 rounded-full border border-gray-200 active:bg-gray-50"
        >
          <Text className="text-gray-900 font-bold text-xs">Resume</Text>
        </Pressable>
        <Text className="text-lg font-black text-gray-900 text-center flex-1">Save Activity</Text>
        <View className="w-16" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled"
        >
          <SaveActivityForm
            distanceM={distanceM}
            movingS={movingS}
            elevGainM={s ? s.elevGainM : rec.elevGainM}
            second={second}
            route={route}
            title={title}
            onTitleChange={(t) => {
              setTitle(t);
              setTitleEdited(true);
            }}
            description={description}
            onDescriptionChange={setDescription}
            sportConfig={cfg}
            onOpenSportSheet={() => setSportSheet(true)}
            visibility={visibility}
            onOpenVisibilitySheet={() => setVisibilitySheet(true)}
            saving={saving}
            onDiscard={onDiscard}
          />
          {blocked ? (
            <View className="mt-4">
              <ErrorState compact message={blocked} />
            </View>
          ) : null}
          {error ? (
            <View className="mt-4">
              <ErrorState compact message={error} />
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky Bottom Save Activity Button */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
          className="px-4 pt-3 bg-white border-t border-gray-100 shadow-md"
        >
          <Pressable
            onPress={onSave}
            disabled={saving || !title.trim() || Boolean(blocked)}
            accessibilityRole="button"
            accessibilityLabel="Save Activity"
            className={`h-14 rounded-full flex-row items-center justify-center shadow-lg ${blocked ? 'bg-gray-300' : 'bg-[#FC4C02] active:bg-[#E03A00]'}`}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                <Text className="text-white text-base font-black ml-2">
                  {error ? 'Try again' : 'Save Activity'}
                </Text>
              </>
            )}
          </Pressable>
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
      <BottomSheet
        visible={visibilitySheet}
        onClose={() => setVisibilitySheet(false)}
        title="Who can view"
      >
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

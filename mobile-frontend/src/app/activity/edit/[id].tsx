import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VISIBILITY_LABEL } from '../../../components/activity/FeedCard';
import { SportSheet } from '../../../components/record/SportSheet';
import {
  AppBar,
  BottomSheet,
  Button,
  ErrorState,
  LoadingState,
  OptionRow,
  SectionTitle,
  SelectField,
  space,
  TextField,
} from '../../../design';
import { useActivityStore } from '../../../lib/activityStore';
import { sportConfig } from '../../../lib/sports';
import { api } from '../../../services/api';
import { ActivityVisibility, SportType } from '../../../types';

const VISIBILITY_OPTIONS: { id: ActivityVisibility; title: string; description: string }[] = [
  { id: 'PUBLIC', title: 'Everyone', description: 'Anyone can view this activity.' },
  { id: 'FOLLOWERS_ONLY', title: 'Followers', description: 'Only people who follow you can view this activity.' },
  { id: 'ONLY_ME', title: 'Only you', description: 'Private. Only you can view this activity.' },
];

/** Edit activity (owner only; the server enforces ownership — PATCH /activities/:id). */
export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cached = id ? useActivityStore.getState().activities[id] : undefined;
  const [loaded, setLoaded] = useState<'loading' | 'ready' | 'error'>(cached ? 'ready' : 'loading');
  const [title, setTitle] = useState(cached?.title ?? '');
  const [description, setDescription] = useState(cached?.description ?? '');
  const [sport, setSport] = useState<SportType>(cached?.sportType ?? 'Run');
  const [visibility, setVisibility] = useState<ActivityVisibility>(cached?.visibility ?? 'PUBLIC');
  const [sportSheet, setSportSheet] = useState(false);
  const [visibilitySheet, setVisibilitySheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.activities.get(id).then(
      (res) => {
        if (cancelled) return;
        if (!res?.isOwner) return setLoaded('error');
        const a = res.activity;
        setTitle(a.title ?? '');
        setDescription(a.description ?? '');
        setSport(a.sportType);
        setVisibility(a.visibility);
        setLoaded('ready');
      },
      () => {
        if (!cancelled && !cached) setLoaded('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id, cached]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const descriptionValue = description.trim() || null;
    const cleanTitle = title.trim();
    console.log(`[ACTIVITY_EDIT] Saving edit for activity ${id}: title="${cleanTitle}", sport="${sport}", visibility="${visibility}"`);
    try {
      await useActivityStore.getState().updateActivityDetails(id!, {
        title: cleanTitle,
        description: descriptionValue,
        sportType: sport,
        visibility,
      });
      router.back();
    } catch (e: any) {
      console.error(`[ACTIVITY_EDIT_ERROR] Failed to save activity ${id}:`, e);
      setError(e?.message ?? 'Could not save changes.');
      setSaving(false);
    }
  };

  const cfg = sportConfig(sport);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar
        title="Edit Activity"
        right={
          <Button
            label="Save"
            size="sm"
            variant="primary"
            loading={saving}
            disabled={!title.trim()}
            onPress={onSave}
          />
        }
      />
      {loaded === 'loading' ? (
        <LoadingState />
      ) : loaded === 'error' ? (
        <ErrorState message="This activity can’t be edited." />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <TextField value={title} onChangeText={setTitle} placeholder="Title" accessibilityLabel="Activity title" maxLength={100} />
              <View style={{ height: space.md }} />
              <TextField
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                accessibilityLabel="Description"
                multiline
                maxLength={2000}
              />
              <View style={{ height: space.md }} />
              <SelectField value={cfg.label} icon={cfg.icon} onPress={() => setSportSheet(true)} accessibilityLabel="Sport" />
              <SectionTitle title="Who can view" style={{ marginTop: space.xxl }} />
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
            </ScrollView>
          </View>
          <View style={{ paddingBottom: Math.max(insets.bottom, 16), backgroundColor: '#FFFFFF' }} className="px-4 pt-3 border-t border-gray-100">
            <Button label="Save changes" size="lg" fullWidth loading={saving} disabled={!title.trim()} onPress={onSave} />
          </View>
        </KeyboardAvoidingView>
      )}
      <SportSheet
        visible={sportSheet}
        selected={sport}
        onSelect={(s) => {
          setSport(s);
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

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { useActivityDetail, useUpdateActivity } from '../../../hooks/useActivities';
import { sportConfig } from '../../../lib/sports';
import { ActivityVisibility, SportType } from '../../../types';

const VISIBILITY_OPTIONS: { id: ActivityVisibility; title: string; description: string }[] = [
  { id: 'PUBLIC', title: 'Everyone', description: 'Anyone can view this activity.' },
  {
    id: 'FOLLOWERS_ONLY',
    title: 'Followers',
    description: 'Only people who follow you can view this activity.',
  },
  { id: 'ONLY_ME', title: 'Only you', description: 'Private. Only you can view this activity.' },
];

function EditForm({ id, activity }: { id: string; activity: any }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: updateActivity, isPending: saving } = useUpdateActivity();

  const [title, setTitle] = useState(activity.title ?? '');
  const [description, setDescription] = useState(activity.description ?? '');
  const [sport, setSport] = useState<SportType>(activity.sportType ?? 'Run');
  const [visibility, setVisibility] = useState<ActivityVisibility>(activity.visibility ?? 'PUBLIC');
  const [sportSheet, setSportSheet] = useState(false);
  const [visibilitySheet, setVisibilitySheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    if (saving || !id) return;
    setError(null);
    const descriptionValue = description.trim() || null;
    const cleanTitle = title.trim();

    updateActivity(
      {
        id,
        patch: {
          title: cleanTitle,
          description: descriptionValue,
          sportType: sport,
          visibility,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (e: any) => setError(e?.message ?? 'Could not save changes.'),
      }
    );
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              accessibilityLabel="Activity title"
              maxLength={100}
            />
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
            <SelectField
              value={cfg.label}
              icon={cfg.icon}
              onPress={() => setSportSheet(true)}
              accessibilityLabel="Sport"
            />
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

          <SportSheet
            visible={sportSheet}
            onClose={() => setSportSheet(false)}
            selected={sport}
            onSelect={(next) => {
              setSport(next);
              setSportSheet(false);
            }}
          />

          <BottomSheet
            visible={visibilitySheet}
            onClose={() => setVisibilitySheet(false)}
            title="Who can see this?"
          >
            <View style={{ paddingBottom: insets.bottom + space.lg }}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <OptionRow
                  key={opt.id}
                  title={opt.title}
                  description={opt.description}
                  selected={visibility === opt.id}
                  onPress={() => {
                    setVisibility(opt.id);
                    setVisibilitySheet(false);
                  }}
                />
              ))}
            </View>
          </BottomSheet>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Edit activity (owner only; PATCH /activities/:id). */
export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useActivityDetail(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AppBar title="Edit Activity" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isError || !data?.activity || !data.isOwner) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AppBar title="Edit Activity" />
        <ErrorState message="This activity can’t be edited." />
      </SafeAreaView>
    );
  }

  return <EditForm id={id!} activity={data.activity} />;
}

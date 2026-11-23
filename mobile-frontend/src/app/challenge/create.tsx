import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { useApp } from '../../context/AppContext';
import { Chip, ChipRow, SectionTitle, TextField } from '../../design';
import { useChallengeDetail, useCreateChallenge, useUpdateChallenge } from '../../hooks/useGroups';
import { MVP_SPORTS } from '../../lib/sports';

const DURATIONS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { refreshFeed } = useApp();
  const { data: detailData } = useChallengeDetail(editId);
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();

  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [targetKm, setTargetKm] = useState('');
  const [days, setDays] = useState(30);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detailData?.challenge) {
      const c = detailData.challenge;
      setTitle(c.title || '');
      setSportType(c.sportType || 'Run');
      if (c.targetMeters) {
        setTargetKm(String(Number(c.targetMeters) / 1000));
      }
      setDescription(c.description || '');
    }
  }, [detailData]);

  const km = Number(targetKm.replace(',', '.'));
  const valid = title.trim().length > 2 && Number.isFinite(km) && km > 0 && km <= 100_000;

  const submit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Required', 'Please enter a challenge name (at least 3 characters).');
      return;
    }
    if (!Number.isFinite(km) || km <= 0) {
      Alert.alert('Required', 'Please enter a valid distance goal in kilometres.');
      return;
    }

    setError(null);
    try {
      if (editId) {
        await updateChallenge.mutateAsync({
          id: editId,
          data: {
            title: title.trim(),
            sportType,
            targetMeters: Math.round(km * 1000),
            description: description.trim() || undefined,
          },
        });
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/challenge/[id]', params: { id: editId } });
      } else {
        const start = new Date();
        const res = await createChallenge.mutateAsync({
          title: title.trim(),
          sportType,
          targetMeters: Math.round(km * 1000),
          description: description.trim() || undefined,
          startDate: start.toISOString(),
          endDate: new Date(start.getTime() + days * 86_400_000).toISOString(),
        });
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/challenge/[id]', params: { id: (res as any).challenge.id } });
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (editId ? 'Could not update the challenge.' : 'Could not create the challenge.')
      );
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit Challenge' : 'Create Challenge'}
      submitLabel={editId ? 'Save changes' : 'Create Challenge'}
      canSubmit={valid}
      submitting={createChallenge.isPending || updateChallenge.isPending}
      error={error}
      onSubmit={submit}
    >
      <TextField
        label="Challenge name"
        placeholder="e.g. November 100 km Challenge"
        value={title}
        onChangeText={setTitle}
      />

      <SectionTitle title="Activity type" />
      <ChipRow>
        {MVP_SPORTS.map((s) => (
          <Chip
            key={s.id}
            label={s.label}
            selected={sportType === s.id}
            onPress={() => setSportType(s.id)}
          />
        ))}
      </ChipRow>

      <TextField
        label="Distance goal (km)"
        placeholder="50"
        value={targetKm}
        onChangeText={setTargetKm}
        keyboardType="decimal-pad"
        helper="Distance required to complete the challenge"
      />

      {!editId && (
        <View>
          <SectionTitle title="Duration" />
          <ChipRow>
            {DURATIONS.map((d) => (
              <Chip
                key={d.days}
                label={d.label}
                selected={days === d.days}
                onPress={() => setDays(d.days)}
              />
            ))}
          </ChipRow>
        </View>
      )}

      <TextField
        label="Description (optional)"
        placeholder="Tell participants what this challenge is about..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
    </FormScreen>
  );
}

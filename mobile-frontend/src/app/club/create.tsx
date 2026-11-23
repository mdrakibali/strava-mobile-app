import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { useApp } from '../../context/AppContext';
import { Chip, ChipRow, SectionTitle, space, TextField } from '../../design';
import { useClubDetail, useCreateClub, useUpdateClub } from '../../hooks/useGroups';
import { MVP_SPORTS } from '../../lib/sports';

export default function CreateClubScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { refreshFeed } = useApp();
  const { data: detailData } = useClubDetail(editId);
  const createClub = useCreateClub();
  const updateClub = useUpdateClub();

  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detailData?.club) {
      const c = detailData.club;
      setName(c.name ?? '');
      setSportType(c.sportType ?? 'Run');
      setCity(c.city ?? '');
      setDescription(c.description ?? '');
      setIsPrivate(Boolean(c.isPrivate));
    }
  }, [detailData]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Required', 'Please enter a club name (at least 2 characters).');
      return;
    }

    setError(null);
    try {
      if (editId) {
        await updateClub.mutateAsync({
          id: editId,
          data: {
            name: name.trim(),
            sportType,
            city: city.trim() || null,
            description: description.trim() || null,
            isPrivate,
          },
        });
        router.back();
        return;
      }
      const res = await createClub.mutateAsync({
        name: name.trim(),
        sportType,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        isPrivate,
      });
      await refreshFeed().catch(() => {});
      router.replace({ pathname: '/club/[id]', params: { id: (res as any).club.id } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the club.');
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit Club' : 'Create Club'}
      submitLabel={editId ? 'Save changes' : 'Create Club'}
      canSubmit={name.trim().length > 1}
      submitting={createClub.isPending || updateClub.isPending}
      error={error}
      onSubmit={submit}
    >
      <TextField
        label="Club name"
        placeholder="e.g. Dhaka Morning Runners"
        value={name}
        onChangeText={setName}
      />

      <SectionTitle title="Primary sport" />
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
        label="City / Location (optional)"
        placeholder="e.g. Gulshan, Dhaka"
        value={city}
        onChangeText={setCity}
      />

      <TextField
        label="Description (optional)"
        placeholder="What is this club about? Who should join?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <View style={{ marginTop: space.sm }}>
        <SectionTitle title="Access" />
        <ChipRow>
          <Chip
            label="Public (anyone can join)"
            selected={!isPrivate}
            onPress={() => setIsPrivate(false)}
          />
          <Chip label="Invite only" selected={isPrivate} onPress={() => setIsPrivate(true)} />
        </ChipRow>
      </View>
    </FormScreen>
  );
}

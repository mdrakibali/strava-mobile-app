import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { useApp } from '../../context/AppContext';
import { Chip, ChipRow, SectionTitle, space, TextField } from '../../design';
import { groupStore } from '../../lib/groupStore';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

export default function CreateClubScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { refreshFeed } = useApp();
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode: prefill from the server copy, never from a list.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    api.clubs.get(editId).then(
      (res) => {
        if (cancelled || !res?.club) return;
        setName(res.club.name ?? '');
        setSportType(res.club.sportType ?? 'Run');
        setCity(res.club.city ?? '');
        setDescription(res.club.description ?? '');
        setIsPrivate(Boolean(res.club.isPrivate));
      },
      (e: any) => !cancelled && setError(e?.message ?? 'Could not load the club.')
    );
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Required', 'Please enter a club name (at least 2 characters).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await api.clubs.update(editId, {
          name: name.trim(),
          sportType,
          city: city.trim() || null,
          description: description.trim() || null,
          isPrivate,
        });
        groupStore.patchClub(editId, {
          name: name.trim(),
          sportType,
          city: city.trim() || null,
          description: description.trim() || null,
          isPrivate,
        });
        router.back();
        return;
      }
      const res = await api.clubs.create({
        name: name.trim(),
        sportType,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        isPrivate,
      });
      if (res?.club) {
        groupStore.seedClubs([res.club]);
      }
      await refreshFeed().catch(() => {});
      router.replace({ pathname: '/club/[id]', params: { id: res.club.id } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the club.');
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit Club' : 'Create Club'}
      submitLabel={editId ? 'Save changes' : 'Create Club'}
      canSubmit={name.trim().length > 1}
      submitting={saving}
      error={error}
      onSubmit={submit}>
      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Club name"
        accessibilityLabel="Club name"
        maxLength={80}
      />
      <SectionTitle title="Sport" style={{ marginTop: space.xl }} />
      <ChipRow>
        {MVP_SPORTS.map((s) => (
          <Chip
            key={s.id}
            label={s.label}
            icon={s.icon}
            selected={sportType === s.id}
            onPress={() => setSportType(s.id)}
          />
        ))}
      </ChipRow>
      <View className="h-4" />
      <TextField
        value={city}
        onChangeText={setCity}
        placeholder="City (optional)"
        accessibilityLabel="City"
        maxLength={100}
      />
      <View className="h-3" />
      <TextField
        value={description}
        onChangeText={setDescription}
        placeholder="What is this club about?"
        accessibilityLabel="Description"
        multiline
        maxLength={1000}
      />
      <SectionTitle title="Who can join" className="mt-5" />
      <ChipRow>
        <Chip
          label="Anyone"
          icon="globe-outline"
          selected={!isPrivate}
          onPress={() => setIsPrivate(false)}
        />
        <Chip
          label="Private"
          icon="lock-closed-outline"
          selected={isPrivate}
          onPress={() => setIsPrivate(true)}
        />
      </ChipRow>
    </FormScreen>
  );
}
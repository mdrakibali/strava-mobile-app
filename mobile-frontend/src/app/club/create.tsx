import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { Chip, ChipRow, SectionTitle, space, TextField } from '../../design';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

export default function CreateClubScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Required', 'Please enter a club name (at least 2 characters).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.clubs.create({
        name: name.trim(),
        sportType,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        isPrivate,
      });
      router.replace({ pathname: '/club/[id]', params: { id: res.club.id } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the club.');
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Create Club"
      submitLabel="Create Club"
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

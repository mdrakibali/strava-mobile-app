import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { Chip, ChipRow, SectionTitle, space, TextField } from '../../design';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

const DURATIONS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

/** Create a distance challenge (POST /challenges). Progress counts the joined athletes' activities. */
export default function CreateChallengeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [targetKm, setTargetKm] = useState('');
  const [days, setDays] = useState(30);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const km = Number(targetKm.replace(',', '.'));
  const valid = title.trim().length > 2 && Number.isFinite(km) && km > 0 && km <= 100_000;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const start = new Date();
      const res = await api.challenges.create({
        title: title.trim(),
        sportType,
        targetMeters: Math.round(km * 1000),
        description: description.trim() || undefined,
        startDate: start.toISOString(),
        endDate: new Date(start.getTime() + days * 86_400_000).toISOString(),
      });
      router.replace({ pathname: '/challenge/[id]', params: { id: res.challenge.id } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the challenge.');
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Create Challenge" submitLabel="Create challenge" canSubmit={valid} submitting={saving} error={error} onSubmit={submit}>
      <TextField value={title} onChangeText={setTitle} placeholder="Challenge name (e.g. 100 km in December)" accessibilityLabel="Challenge name" maxLength={100} />
      <SectionTitle title="Sport" style={{ marginTop: space.xl }} />
      <ChipRow>
        {MVP_SPORTS.map((s) => (
          <Chip key={s.id} label={s.label} icon={s.icon} selected={sportType === s.id} onPress={() => setSportType(s.id)} />
        ))}
      </ChipRow>
      <View style={{ height: space.lg }} />
      <TextField value={targetKm} onChangeText={setTargetKm} placeholder="Distance goal (km)" accessibilityLabel="Distance goal in kilometres" keyboardType="decimal-pad" maxLength={7} />
      <SectionTitle title="Duration" style={{ marginTop: space.xl }} />
      <ChipRow>
        {DURATIONS.map((d) => (
          <Chip key={d.days} label={d.label} selected={days === d.days} onPress={() => setDays(d.days)} />
        ))}
      </ChipRow>
      <View style={{ height: space.lg }} />
      <TextField value={description} onChangeText={setDescription} placeholder="Description (optional)" accessibilityLabel="Description" multiline maxLength={1000} />
    </FormScreen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { useApp } from '../../context/AppContext';
import { Chip, ChipRow, SectionTitle, TextField } from '../../design';
import { groupStore } from '../../lib/groupStore';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

const TIMES = Array.from({ length: 33 }, (_, i) => 5 * 60 + i * 30);
const label = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function CreateEventScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { refreshFeed } = useApp();
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState(6 * 60 + 30);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [pace, setPace] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    api.events.get(editId).then((res) => {
      if (res?.event) {
        setTitle(res.event.title || '');
        setSportType(res.event.sportType || 'Run');
        setMeetingPoint(res.event.meetingPoint || '');
        setPace(res.event.paceDescription || '');
        if (res.event.distanceMeters) {
          setDistanceKm(String(Number(res.event.distanceMeters) / 1000));
        }
      }
    }).catch(() => {});
  }, [editId]);

  const [now] = useState(() => Date.now());
  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => new Date(base.getTime() + i * 86_400_000));
  }, []);
  const when = new Date(days[dayOffset].getTime() + time * 60_000);
  const km = distanceKm ? Number(distanceKm.replace(',', '.')) : null;
  const valid = Boolean(
    title.trim().length > 2 &&
    meetingPoint.trim().length > 1 &&
    (Boolean(editId) || when.getTime() > now) &&
    (km == null || (Number.isFinite(km) && km >= 0))
  );

  const submit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Required', 'Please enter an event name (at least 3 characters).');
      return;
    }
    if (!meetingPoint.trim() || meetingPoint.trim().length < 2) {
      Alert.alert('Required', 'Please enter a meeting point location.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editId) {
        const res = await api.events.update(editId, {
          title: title.trim(),
          sportType,
          meetingPoint: meetingPoint.trim(),
          paceDescription: pace.trim() || null,
          distanceMeters: km != null ? Math.round(km * 1000) : null,
        });
        if (res?.event) {
          groupStore.patchEvent(editId, res.event);
        }
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/event/[id]', params: { id: editId } });
      } else {
        const res = await api.events.create({
          title: title.trim(),
          sportType,
          eventDate: when.toISOString(),
          meetingPoint: meetingPoint.trim(),
          paceDescription: pace.trim() || undefined,
          distanceMeters: km != null ? Math.round(km * 1000) : undefined,
        });
        if (res?.event) {
          groupStore.seedEvents([res.event]);
        }
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/event/[id]', params: { id: res.event.id } });
      }
    } catch (e: any) {
      setError(e?.message ?? (editId ? 'Could not update the event.' : 'Could not create the event.'));
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit Event' : 'Create Event'}
      submitLabel={editId ? 'Save Changes' : 'Create Event'}
      canSubmit={valid}
      submitting={saving}
      error={error}
      onSubmit={submit}>
      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder="Event name (e.g. Saturday long run)"
        accessibilityLabel="Event name"
        maxLength={120}
      />
      <SectionTitle title="Sport" className="mt-5" />
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
      <SectionTitle title="Day" className="mt-5" />
      <ChipRow>
        {days.map((d, i) => (
          <Chip
            key={i}
            label={
              i === 0
                ? 'Today'
                : i === 1
                ? 'Tomorrow'
                : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            }
            selected={dayOffset === i}
            onPress={() => setDayOffset(i)}
          />
        ))}
      </ChipRow>
      <SectionTitle title="Start time" className="mt-5" />
      <ChipRow>
        {TIMES.map((t) => (
          <Chip key={t} label={label(t)} selected={time === t} onPress={() => setTime(t)} />
        ))}
      </ChipRow>
      <View className="h-4" />
      <TextField
        value={meetingPoint}
        onChangeText={setMeetingPoint}
        placeholder="Meeting point"
        accessibilityLabel="Meeting point"
        maxLength={200}
      />
      <View className="h-3" />
      <TextField
        value={distanceKm}
        onChangeText={setDistanceKm}
        placeholder="Distance (km, optional)"
        accessibilityLabel="Distance in kilometres"
        keyboardType="decimal-pad"
        maxLength={6}
      />
      <View className="h-3" />
      <TextField
        value={pace}
        onChangeText={setPace}
        placeholder="Pace / level (optional)"
        accessibilityLabel="Pace or level"
        maxLength={200}
      />
    </FormScreen>
  );
}
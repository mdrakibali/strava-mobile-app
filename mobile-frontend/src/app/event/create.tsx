import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { FormScreen } from '../../components/forms/FormScreen';
import { useApp } from '../../context/AppContext';
import { Chip, ChipRow, SectionTitle, TextField } from '../../design';
import { useCreateEvent, useEventDetail, useUpdateEvent } from '../../hooks/useGroups';
import { MVP_SPORTS } from '../../lib/sports';

const TIMES = Array.from({ length: 33 }, (_, i) => 5 * 60 + i * 30);
const label = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function CreateEventScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { refreshFeed } = useApp();
  const { data: detailData } = useEventDetail(editId);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState(6 * 60 + 30);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [pace, setPace] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detailData?.event) {
      const e = detailData.event;
      setTitle(e.title || '');
      setSportType(e.sportType || 'Run');
      setMeetingPoint(e.meetingPoint || '');
      setPace(e.paceDescription || '');
      if (e.distanceMeters) {
        setDistanceKm(String(Number(e.distanceMeters) / 1000));
      }
    }
  }, [detailData]);

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

    setError(null);
    try {
      if (editId) {
        await updateEvent.mutateAsync({
          id: editId,
          data: {
            title: title.trim(),
            sportType,
            meetingPoint: meetingPoint.trim(),
            paceDescription: pace.trim() || null,
            distanceMeters: km != null ? Math.round(km * 1000) : null,
          },
        });
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/event/[id]', params: { id: editId } });
      } else {
        const res = await createEvent.mutateAsync({
          title: title.trim(),
          sportType,
          eventDate: when.toISOString(),
          meetingPoint: meetingPoint.trim(),
          paceDescription: pace.trim() || undefined,
          distanceMeters: km != null ? Math.round(km * 1000) : undefined,
        });
        await refreshFeed().catch(() => {});
        router.replace({ pathname: '/event/[id]', params: { id: (res as any).event.id } });
      }
    } catch (e: any) {
      setError(
        e?.message ?? (editId ? 'Could not update the event.' : 'Could not create the event.')
      );
    }
  };

  return (
    <FormScreen
      title={editId ? 'Edit Group Activity' : 'Create Group Activity'}
      submitLabel={editId ? 'Save changes' : 'Create Group Activity'}
      canSubmit={valid}
      submitting={createEvent.isPending || updateEvent.isPending}
      error={error}
      onSubmit={submit}
    >
      <TextField
        label="Event name"
        placeholder="e.g. Saturday Morning Long Run"
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

      {!editId && (
        <View>
          <SectionTitle title="Date" />
          <ChipRow>
            {days.map((d, i) => {
              const text =
                i === 0
                  ? 'Today'
                  : i === 1
                    ? 'Tomorrow'
                    : d.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
              return (
                <Chip
                  key={d.toISOString()}
                  label={text}
                  selected={dayOffset === i}
                  onPress={() => setDayOffset(i)}
                />
              );
            })}
          </ChipRow>

          <SectionTitle title="Start time" />
          <ChipRow>
            {TIMES.map((m) => (
              <Chip key={m} label={label(m)} selected={time === m} onPress={() => setTime(m)} />
            ))}
          </ChipRow>
        </View>
      )}

      <TextField
        label="Meeting point"
        placeholder="e.g. Dhanmondi Lake, Bridge 1"
        value={meetingPoint}
        onChangeText={setMeetingPoint}
      />

      <TextField
        label="Target pace (optional)"
        placeholder="e.g. 5:30 min/km or Casual"
        value={pace}
        onChangeText={setPace}
      />

      <TextField
        label="Target distance in km (optional)"
        placeholder="10"
        value={distanceKm}
        onChangeText={setDistanceKm}
        keyboardType="decimal-pad"
      />
    </FormScreen>
  );
}

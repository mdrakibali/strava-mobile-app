import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  AppBar,
  AppText,
  Avatar,
  Button,
  color,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
  space,
} from '../../design';
import { groupStore, useEvent } from '../../lib/groupStore';
import { kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';
import { api } from '../../services/api';

type Rsvp = 'GOING' | 'MAYBE' | null;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      void reloadKey;
      const readTick = groupStore.beginRead();
      api.events.get(id).then(
        (res) => {
          if (cancelled) return;
          const isStale = groupStore.isStaleRead(id, readTick);
          setEvent((prev: any) => {
            if (isStale && prev && res.event) {
              return {
                ...res.event,
                rsvpStatus: prev.rsvpStatus,
                attendeesCount: prev.attendeesCount,
              };
            }
            return res.event;
          });
          setAttendees(res.attendees ?? []);
          if (res.event) {
            groupStore.seedEvents([res.event], readTick);
          }
          setStatus('ready');
        },
        (e: any) =>
          !cancelled && setStatus(/not found/i.test(String(e?.message)) ? 'notFound' : 'error')
      );
      return () => {
        cancelled = true;
      };
    }, [id, reloadKey])
  );

  const liveEvent = useEvent(id ?? '', event);
  const currentEvent = liveEvent && event ? { ...event, ...liveEvent } : (liveEvent ?? event);
  const mine: Rsvp =
    (liveEvent?.rsvpStatus as Rsvp) ??
    (attendees.find((a) => a.athleteId === currentUser.id)?.status as Rsvp) ??
    null;
  const going = attendees.filter((a) => a.status === 'GOING');

  const setRsvp = async (next: 'GOING' | 'MAYBE' | 'DECLINED') => {
    setBusy(true);
    try {
      const updated = await groupStore.rsvpEvent(id!, next, currentEvent);
      setAttendees((prev) => {
        const others = prev.filter((a) => a.athleteId !== currentUser.id);
        return updated.rsvpStatus
          ? [
              ...others,
              {
                athleteId: currentUser.id,
                status: updated.rsvpStatus,
                displayName: currentUser.displayName,
                avatarUrl: currentUser.avatarUrl,
              },
            ]
          : others;
      });
    } catch (e: any) {
      Alert.alert('RSVP not updated', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (status !== 'ready' || !event) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AppBar title="Event" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {status === 'loading' ? (
            <LoadingState />
          ) : status === 'notFound' ? (
            <EmptyState
              icon="calendar-outline"
              title="Event not found"
              primary={{ label: 'Go back', onPress: () => router.back() }}
            />
          ) : (
            <ErrorState
              message="We couldn’t load this event."
              onRetry={() => {
                setStatus('loading');
                setReloadKey((k) => k + 1);
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const when = new Date(event.eventDate);
  const sport = sportConfig(event.sportType);
  const distance = event.distanceMeters != null ? Number(event.distanceMeters) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar title="Event" />
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 64, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="label" color="brandText" style={{ fontWeight: '700' }}>
            {when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}{' '}
            · {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </AppText>
          <AppText variant="title1" style={{ marginTop: space.xs }}>
            {event.title}
          </AppText>
          <View className="flex-row items-center mt-2">
            <Ionicons name={sport.icon} size={16} color={color.inkSecondary} />
            <AppText variant="label" color="inkSecondary" style={{ marginLeft: space.xs, flex: 1 }}>
              {sport.label}
              {event.club?.name ? ` · ${event.club.name}` : ''}
              {event.creator?.displayName ? ` · hosted by ${event.creator.displayName}` : ''}
            </AppText>
          </View>

          <View className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <Info icon="location-outline" label="Meeting point" value={event.meetingPoint} />
            {distance ? (
              <Info icon="resize-outline" label="Distance" value={`${kmValue(distance)} km`} />
            ) : null}
            {event.paceDescription ? (
              <Info icon="speedometer-outline" label="Pace / level" value={event.paceDescription} />
            ) : null}
            <Info icon="people-outline" label="Going" value={String(going.length)} />
          </View>

          <View className="flex-row items-center mt-4">
            <Button
              label={mine === 'GOING' ? 'Going ✓' : 'Going'}
              variant={mine === 'GOING' ? 'secondary' : 'primary'}
              loading={busy}
              style={{ flex: 1 }}
              onPress={() => setRsvp('GOING')}
            />
            <Button
              label={mine === 'MAYBE' ? 'Maybe ✓' : 'Maybe'}
              variant="outline"
              disabled={busy}
              style={{ flex: 1, marginLeft: space.sm }}
              onPress={() => setRsvp('MAYBE')}
            />
            {mine ? (
              <Button
                label="Can’t go"
                variant="ghost"
                disabled={busy}
                style={{ marginLeft: space.sm }}
                onPress={() => setRsvp('DECLINED')}
              />
            ) : null}
          </View>

          {currentUser?.id === event.creator?.id ? (
            <View className="flex-row items-center mt-3">
              <Button
                label="Edit Event"
                variant="outline"
                style={{ flex: 1, marginRight: space.sm }}
                onPress={() =>
                  router.push({ pathname: '/event/create', params: { editId: event.id } })
                }
              />
              <Button
                label="Delete Event"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() =>
                  Alert.alert(
                    'Delete this event?',
                    'Attendees will be notified. This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.events.remove(event.id);
                            groupStore.remove(event.id);
                            router.replace('/(tabs)/groups');
                          } catch (e: any) {
                            Alert.alert('Couldn’t delete event', e?.message ?? 'Please try again.');
                          }
                        },
                      },
                    ]
                  )
                }
              />
            </View>
          ) : null}

          <SectionTitle title={`Attendees (${attendees.length})`} style={{ marginTop: space.xl }} />
          {attendees.length === 0 ? (
            <AppText variant="body" color="inkSecondary">
              No one has responded yet.
            </AppText>
          ) : (
            attendees.map((a) => (
              <Pressable
                key={a.athleteId}
                onPress={() =>
                  router.push({ pathname: '/athlete/[id]', params: { id: a.athleteId } })
                }
                className="flex-row items-center py-2"
                accessibilityRole="button"
              >
                <Avatar uri={a.avatarUrl} name={a.displayName} size={40} />
                <AppText variant="bodyStrong" style={{ flex: 1, marginLeft: space.md }}>
                  {a.displayName}
                </AppText>
                <AppText variant="label" color="inkSecondary">
                  {a.status === 'GOING' ? 'Going' : 'Maybe'}
                </AppText>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const Info: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View className="flex-row items-center py-2">
    <Ionicons name={icon} size={20} color={color.inkSecondary} />
    <View style={{ marginLeft: space.md, flex: 1 }}>
      <AppText variant="label" color="inkSecondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  </View>
);

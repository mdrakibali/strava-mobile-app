import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
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
import { useDeleteEvent, useEventDetail, useRsvpEvent } from '../../hooks/useGroups';
import { kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';

type Rsvp = 'GOING' | 'MAYBE' | null;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();

  const { data, isLoading, isError, error, refetch, isRefetching } = useEventDetail(id);
  const { mutate: rsvpEvent, isPending: busy } = useRsvpEvent();
  const { mutate: deleteEvent } = useDeleteEvent();

  const event = data?.event;
  const attendees = data?.attendees ?? [];

  if (isLoading || (!event && !isError)) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.surface }}>
        <AppBar title="Event" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isError || !event) {
    const isNotFound = /not found/i.test(String(error?.message || ''));
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.surface }}>
        <AppBar title="Event" />
        {isNotFound ? (
          <EmptyState
            icon="calendar-outline"
            title="Event not found"
            body="This event may have been cancelled or deleted."
            primary={{ label: 'Back to Groups', onPress: () => router.back() }}
          />
        ) : (
          <ErrorState
            message={error?.message || 'We couldn’t load this event.'}
            onRetry={() => refetch()}
          />
        )}
      </SafeAreaView>
    );
  }

  const mine: Rsvp =
    (attendees.find((a: any) => a.athleteId === currentUser.id)?.status as Rsvp) ??
    (event.rsvpStatus as Rsvp) ??
    null;
  const going = attendees.filter((a: any) => a.status === 'GOING');
  const d = new Date(event.eventDate);
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const isCreator = event.creatorId === currentUser.id;
  const sport = sportConfig(event.sportType);

  const setRsvp = (next: 'GOING' | 'MAYBE' | 'DECLINED') => {
    rsvpEvent(
      { id: id!, status: next },
      {
        onError: (e: any) => {
          Alert.alert('RSVP not updated', e?.message ?? 'Please try again.');
        },
      }
    );
  };

  const confirmDelete = () => {
    Alert.alert('Delete this event?', 'Attendees will be notified. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEvent(event.id, {
            onSuccess: () => router.replace('/(tabs)/groups'),
            onError: (e: any) =>
              Alert.alert('Couldn’t delete event', e?.message ?? 'Please try again.'),
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.surface }}>
      <AppBar title={event.title} />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            colors={['#FC4C02']}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFF5F0',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: space.sm,
            }}
          >
            <Ionicons name={sport.icon as any} size={20} color="#FC4C02" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title1" style={{ fontWeight: '800' }}>
              {event.title}
            </AppText>
            {event.club ? (
              <AppText variant="caption" color="inkSecondary">
                Hosted by {event.club.name}
              </AppText>
            ) : null}
          </View>
        </View>

        <View
          style={{
            backgroundColor: color.canvas,
            borderRadius: 16,
            padding: space.md,
            marginTop: space.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
            <Ionicons
              name="time-outline"
              size={18}
              color="#6B7280"
              style={{ marginRight: space.sm }}
            />
            <AppText variant="body" style={{ fontWeight: '600' }}>
              {dateStr} at {timeStr}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
            <Ionicons
              name="location-outline"
              size={18}
              color="#6B7280"
              style={{ marginRight: space.sm }}
            />
            <AppText variant="body" color="ink">
              {event.meetingPoint}
            </AppText>
          </View>

          {event.distanceMeters ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <Ionicons
                name="navigate-outline"
                size={18}
                color="#6B7280"
                style={{ marginRight: space.sm }}
              />
              <AppText variant="body" color="ink">
                {kmValue(event.distanceMeters)} km
              </AppText>
            </View>
          ) : null}

          {event.paceDescription ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color="#6B7280"
                style={{ marginRight: space.sm }}
              />
              <AppText variant="body" color="inkSecondary">
                Pace: {event.paceDescription}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* RSVP picker */}
        <SectionTitle title="Are you going?" style={{ marginTop: space.xl }} />
        <View style={{ flexDirection: 'row', marginTop: space.sm }}>
          {(['GOING', 'MAYBE'] as const).map((opt) => {
            const active = mine === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setRsvp(active ? 'DECLINED' : opt)}
                disabled={busy}
                style={{
                  flex: 1,
                  backgroundColor: active ? '#FC4C02' : color.canvas,
                  borderRadius: 12,
                  paddingVertical: space.md,
                  alignItems: 'center',
                  marginRight: opt === 'GOING' ? space.sm : 0,
                }}
              >
                <AppText
                  variant="label"
                  style={{
                    color: active ? '#FFFFFF' : '#111827',
                    fontWeight: '700',
                  }}
                >
                  {opt === 'GOING' ? 'Going' : 'Maybe'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {mine ? (
          <Pressable
            onPress={() => setRsvp('DECLINED')}
            disabled={busy}
            style={{ alignSelf: 'center', marginTop: space.sm, padding: space.xs }}
          >
            <AppText variant="caption" color="inkTertiary">
              Can’t go? Clear response
            </AppText>
          </Pressable>
        ) : null}

        {/* Creator actions */}
        {isCreator ? (
          <View style={{ flexDirection: 'row', marginTop: space.lg }}>
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
              onPress={confirmDelete}
            />
          </View>
        ) : null}

        <SectionTitle title={`Attendees (${attendees.length})`} style={{ marginTop: space.xl }} />
        {attendees.length === 0 ? (
          <AppText variant="body" color="inkSecondary">
            No one has responded yet. Be the first!
          </AppText>
        ) : (
          attendees.map((a: any) => (
            <View
              key={a.athleteId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space.sm,
                borderBottomWidth: 1,
                borderBottomColor: color.border,
              }}
            >
              <Avatar uri={a.avatarUrl} name={a.displayName} size={40} />
              <View style={{ flex: 1, marginLeft: space.sm }}>
                <AppText variant="body" style={{ fontWeight: '600' }}>
                  {a.displayName}
                </AppText>
                <AppText variant="caption" color="inkSecondary">
                  {a.status === 'GOING' ? 'Going' : 'Interested'}
                </AppText>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

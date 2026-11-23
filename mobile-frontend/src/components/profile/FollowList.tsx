import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  AppBar,
  AppText,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../design';
import { useAthleteFollows, useFollowMutation } from '../../hooks/useAthletes';
import { toAthleteSummary } from '../../lib/activityView';
import { captureFollowEpochs, commitServerFollow, useFollow } from '../../lib/social';

interface Row {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  isFollowing: boolean;
  isSelf: boolean;
}

const FollowRow: React.FC<{
  row: Row;
  busy: boolean;
  onOpen: () => void;
  onToggle: (currentlyFollowing: boolean) => void;
}> = ({ row, busy, onOpen, onToggle }) => {
  const isFollowing = useFollow(row.id, row.isFollowing);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
    >
      <Avatar uri={row.avatarUrl} name={row.displayName} size={48} />
      <View className="flex-1 ml-3">
        <AppText variant="bodyStrong">{row.displayName}</AppText>
        {row.city ? (
          <AppText variant="caption" color="inkSecondary">
            {row.city}
          </AppText>
        ) : null}
      </View>
      {!row.isSelf ? (
        <Button
          label={isFollowing ? 'Following' : 'Follow'}
          size="sm"
          variant={isFollowing ? 'outline' : 'primary'}
          icon={isFollowing ? 'checkmark' : 'person-add-outline'}
          loading={busy}
          onPress={() => onToggle(isFollowing)}
        />
      ) : null}
    </Pressable>
  );
};

/** Followers / Following of an athlete (GET /athletes/:id/followers|following). */
export const FollowList: React.FC<{ kind: 'followers' | 'following' }> = ({ kind }) => {
  const params = useLocalSearchParams<{ id?: string }>();
  const { currentUser, updateCurrentUser } = useApp();
  const athleteId = params.id || currentUser.id;
  const router = useRouter();

  const { data: rawList = [], isLoading, isError, error, isRefetching, refetch } = useAthleteFollows(
    athleteId,
    kind
  );
  const followMutation = useFollowMutation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows: Row[] = useMemo(() => {
    const snapshot = captureFollowEpochs();
    return rawList.map((a: any) => {
      const s = toAthleteSummary(a);
      return {
        id: s.id,
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        city: s.city,
        isFollowing: commitServerFollow(s.id, Boolean(a.isFollowing), snapshot),
        isSelf: a.id === currentUser.id,
      };
    });
  }, [rawList, currentUser.id]);

  const toggle = async (r: Row, currentFollowing: boolean) => {
    setBusyId(r.id);
    try {
      const res = await followMutation.mutateAsync({
        athleteId: r.id,
        follow: !currentFollowing,
      });
      if (currentUser.id && typeof res.followingCount === 'number') {
        updateCurrentUser({ followingCount: res.followingCount });
      }
    } catch (e: any) {
      Alert.alert('Couldn’t update', e?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const title = kind === 'followers' ? 'Followers' : 'Following';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar title={title} />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={(error as any)?.message ?? `We couldn’t load ${title.toLowerCase()}.`}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={kind === 'followers' ? 'people-outline' : 'person-add-outline'}
          title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          body={
            kind === 'followers'
              ? 'When athletes follow this profile, they’ll show up here.'
              : 'Find friends from Search to follow their activities and kudos.'
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              colors={['#FC4C02']}
            />
          }
          renderItem={({ item }) => (
            <FollowRow
              row={item}
              busy={busyId === item.id}
              onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: item.id } })}
              onToggle={(currentFollowing) => toggle(item, currentFollowing)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

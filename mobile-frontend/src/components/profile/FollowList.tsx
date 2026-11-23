import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppBar, AppText, Avatar, Button, EmptyState, ErrorState, LoadingState, space } from '../../design';
import { toAthleteSummary } from '../../lib/activityView';
import { captureFollowEpochs, commitServerFollow, setFollowing, useFollow } from '../../lib/social';
import { api } from '../../services/api';

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
      className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50">
      <Avatar uri={row.avatarUrl} name={row.displayName} size={48} />
      <View className="flex-1 ml-3">
        <AppText variant="bodyStrong">{row.displayName}</AppText>
        {row.city ? <AppText variant="caption" color="inkSecondary">{row.city}</AppText> : null}
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

/** Followers / Following of an athlete (GET /athletes/:id/followers|following), paginated. */
export const FollowList: React.FC<{ kind: 'followers' | 'following' }> = ({ kind }) => {
  const params = useLocalSearchParams<{ id?: string }>();
  const { currentUser, updateCurrentUser } = useApp();
  const athleteId = params.id || currentUser.id;
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const toRow = useCallback((a: any, snapshot: Map<string, number>): Row => {
    const s = toAthleteSummary(a);
    return {
      id: s.id,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      city: s.city,
      isFollowing: commitServerFollow(s.id, Boolean(a.isFollowing), snapshot),
      isSelf: a.id === currentUser.id,
    };
  }, [currentUser.id]);

  const loadList = useCallback(() => {
    const snapshot = captureFollowEpochs();
    let cancelled = false;
    api.athletes.listFollows(athleteId, kind).then(
      (res) => {
        if (cancelled) return;
        setRows(res.athletes.map((a: any) => toRow(a, snapshot)));
        setStatus('ready');
        setRefreshing(false);
      },
      (e: any) => {
        if (cancelled) return;
        setErrMsg(e?.message ?? null);
        setStatus((s) => (s === 'ready' ? s : 'error'));
        setRefreshing(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [athleteId, kind, toRow]);

  useEffect(() => {
    return loadList();
  }, [loadList, reloadKey]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const toggle = async (r: Row, currentFollowing: boolean) => {
    setBusy(r.id);
    try {
      const res = await setFollowing(r.id, currentFollowing, !currentFollowing);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, isFollowing: res.isFollowing } : x)));
      if (currentUser.id && typeof res.followingCount === 'number') {
        updateCurrentUser({ followingCount: res.followingCount });
      }
    } catch (e: any) {
      Alert.alert('Couldn’t update', e?.message ?? 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const title = kind === 'followers' ? 'Followers' : 'Following';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar title={title} />
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={errMsg ?? `We couldn’t load ${title.toLowerCase()}.`} onRetry={() => { setStatus('loading'); setReloadKey((k) => k + 1); }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setReloadKey((k) => k + 1); }} colors={['#FC4C02']} />}
          contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              primary={athleteId === currentUser.id ? { label: 'Find athletes', onPress: () => router.push('/search') } : undefined}
            />
          }
          renderItem={({ item: r }) => (
            <FollowRow
              row={r}
              busy={busy === r.id}
              onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: r.id } })}
              onToggle={(currentlyFollowing) => toggle(r, currentlyFollowing)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

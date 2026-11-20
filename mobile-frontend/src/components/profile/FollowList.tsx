import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppBar, AppText, Avatar, Button, color, EmptyState, ErrorState, LoadingState, space } from '../../design';
import { toAthleteSummary } from '../../lib/activityView';
import { setFollowing } from '../../lib/social';
import { api } from '../../services/api';

interface Row {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  isFollowing: boolean;
  isSelf: boolean;
}

/** Followers / Following of an athlete (GET /athletes/:id/followers|following), paginated. */
export const FollowList: React.FC<{ kind: 'followers' | 'following' }> = ({ kind }) => {
  const params = useLocalSearchParams<{ id?: string }>();
  const { currentUser } = useApp();
  const athleteId = params.id || currentUser.id;
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cursor = useRef<string | null>(null);

  const map = (a: any): Row => {
    const s = toAthleteSummary(a);
    return { id: s.id, displayName: s.displayName, avatarUrl: s.avatarUrl, city: s.city, isFollowing: Boolean(a.isFollowing), isSelf: a.id === currentUser.id };
  };

  useEffect(() => {
    let cancelled = false;
    api.athletes.listFollows(athleteId, kind).then(
      (res) => {
        if (cancelled) return;
        cursor.current = res.nextCursor;
        setRows(res.athletes.map(map));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, kind, reloadKey]);

  const more = async () => {
    if (!cursor.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.athletes.listFollows(athleteId, kind, cursor.current);
      cursor.current = res.nextCursor;
      setRows((prev) => [...prev, ...res.athletes.map(map).filter((r) => !prev.some((p) => p.id === r.id))]);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = async (r: Row) => {
    setBusy(r.id);
    try {
      const res = await setFollowing(r.id, r.isFollowing, !r.isFollowing);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, isFollowing: res.isFollowing } : x)));
    } catch (e: any) {
      Alert.alert('Couldn’t update', e?.message ?? 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const title = kind === 'followers' ? 'Followers' : 'Following';
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <AppBar title={title} />
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={errMsg ?? `We couldn’t load ${title.toLowerCase()}.`} onRetry={() => { setStatus('loading'); setReloadKey((k) => k + 1); }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          onEndReached={more}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setReloadKey((k) => k + 1); }} colors={['#FC4C02']} />}
          contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              primary={athleteId === currentUser.id ? { label: 'Find athletes', onPress: () => router.push('/search') } : undefined}
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#FC4C02" style={{ margin: space.lg }} /> : undefined}
          renderItem={({ item: r }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: r.id } })}
              accessibilityRole="button"
              className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50">
              <Avatar uri={r.avatarUrl} name={r.displayName} size={48} />
              <View className="flex-1 ml-3">
                <AppText variant="bodyStrong">{r.displayName}</AppText>
                {r.city ? <AppText variant="caption" color="inkSecondary">{r.city}</AppText> : null}
              </View>
              {!r.isSelf ? (
                <Button
                  label={r.isFollowing ? 'Following' : 'Follow'}
                  size="sm"
                  variant={r.isFollowing ? 'secondary' : 'primary'}
                  loading={busy === r.id}
                  onPress={() => toggle(r)}
                />
              ) : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

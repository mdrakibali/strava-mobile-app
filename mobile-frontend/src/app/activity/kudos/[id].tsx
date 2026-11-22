import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import { AppBar, AppText, Avatar, color, EmptyState, ErrorState, LoadingState, space } from '../../../design';
import { toAthleteSummary } from '../../../lib/activityView';
import { useSocial } from '../../../lib/social';
import { api } from '../../../services/api';

/** Who gave kudos (GET /activities/:id/kudos — visibility enforced by the server). */
export default function KudosListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const cursor = useRef<string | null>(null);

  const social = useSocial(id ?? '', { hasKudos: null, kudosCount: count, commentsCount: 0 });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.activities.listKudos(id).then(
      (res) => {
        if (cancelled) return;
        cursor.current = res.nextCursor;
        setItems(res.athletes);
        setCount(res.kudosCount);
        setStatus('ready');
      },
      (e: any) => {
        if (cancelled) return;
        setErrMsg(e?.message ?? null);
        setStatus('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const more = async () => {
    if (!cursor.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.activities.listKudos(id!, cursor.current);
      cursor.current = res.nextCursor;
      setItems((prev) => [...prev, ...res.athletes.filter((a: any) => !prev.some((p) => p.id === a.id))]);
    } finally {
      setLoadingMore(false);
    }
  };

  const displayedCount = social.kudosCount > 0 ? social.kudosCount : count;
  const displayedItems = useMemo(() => {
    let list = [...items];
    if (social.hasKudos === true) {
      if (!list.some((a) => a.id === currentUser?.id) && currentUser?.id) {
        list = [{ id: currentUser.id, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl, city: currentUser.city }, ...list];
      }
    } else if (social.hasKudos === false) {
      list = list.filter((a) => a.id !== currentUser?.id);
    }
    return list;
  }, [items, social.hasKudos, currentUser]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar title={status === 'ready' || displayedCount > 0 ? `Kudos (${displayedCount})` : 'Kudos'} />
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState
          message={errMsg ?? "We couldn’t load kudos."}
          onRetry={() => {
            setStatus('loading');
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(a) => a.id}
          onEndReached={more}
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<EmptyState icon="thumbs-up-outline" title="No kudos yet" />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={color.brand} style={{ margin: space.lg }} /> : undefined}
          renderItem={({ item }) => {
            const a = toAthleteSummary(item);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: a.id } })}
                accessibilityRole="button"
                className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50">
                <Avatar uri={a.avatarUrl} name={a.displayName} size={40} />
                <View style={{ marginLeft: space.md, flex: 1 }}>
                  <AppText variant="bodyStrong">{a.displayName}</AppText>
                  {a.city ? (
                    <AppText variant="caption" color="inkSecondary">
                      {a.city}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

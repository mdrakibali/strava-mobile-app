import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  AppText,
  Avatar,
  Button,
  color,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  radius,
  space,
  type,
} from '../design';
import { AthleteSummary, toAthleteSummary } from '../lib/activityView';
import { setFollowing } from '../lib/social';
import { api } from '../services/api';

type Row = AthleteSummary & { isFollowing: boolean; pending?: boolean };

/**
 * Find athletes (reference: ScreensDesign 374842). One follow request per tap, UI follows the
 * server's returned state (the old screen toggled twice per tap — a no-op; UI/UX audit X-7).
 */
export default function SearchScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const requestId = useRef(0);

  const runSearch = async (q: string) => {
    const myId = ++requestId.current;
    setStatus('loading');
    try {
      const res = await api.athletes.search(q.trim());
      if (myId !== requestId.current) return; // stale response
      setRows(
        (res.athletes || [])
          .filter((a: any) => a.id !== currentUser.id)
          .map((a: any) => ({ ...toAthleteSummary(a), isFollowing: Boolean(a.isFollowing) }))
      );
      setStatus('ready');
    } catch {
      if (myId === requestId.current) setStatus('error');
    }
  };

  const tooShort = query.trim().length < 2;

  useEffect(() => {
    if (tooShort) {
      requestId.current++; // drop any in-flight response
      return;
    }
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tooShort]);

  const onFollow = async (row: Row) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, pending: true } : r)));
    try {
      const res = await setFollowing(row.id, row.isFollowing, !row.isFollowing);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isFollowing: res.isFollowing, pending: false } : r)));
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, pending: false } : r)));
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bar}>
        <IconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={color.inkTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search athletes by name or city"
            placeholderTextColor={color.inkTertiary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search athletes"
            style={[type.body, styles.input]}
          />
          {query.length > 0 ? (
            <IconButton icon="close-circle" size={32} iconColor={color.inkTertiary} accessibilityLabel="Clear search" onPress={() => setQuery('')} />
          ) : null}
        </View>
      </View>

      {tooShort || status === 'idle' ? (
        <EmptyState icon="people-outline" title="Find athletes" body="Search by name or city, then follow athletes to see their activities in your feed." />
      ) : status === 'loading' && rows.length === 0 ? (
        <ActivityIndicator style={{ marginTop: space.xxxl }} color={color.brand} />
      ) : status === 'error' ? (
        <ErrorState message="Search failed. Check your connection and try again." onRetry={() => runSearch(query)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <Divider inset={space.gutter + 48 + space.md} />}
          contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No athletes found" body={`Nobody matches “${query.trim()}”.`} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${item.displayName}'s profile`}>
                <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <AppText variant="title3" numberOfLines={1}>{item.displayName}</AppText>
                  {item.city ? (
                    <AppText variant="caption" color="inkTertiary" numberOfLines={1}>{item.city}</AppText>
                  ) : null}
                </View>
              </Pressable>
              <Button
                label={item.isFollowing ? 'Following' : 'Follow'}
                size="sm"
                variant={item.isFollowing ? 'outline' : 'primary'}
                loading={item.pending}
                onPress={() => onFollow(item)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginLeft: space.xs,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.canvas,
  },
  input: { flex: 1, marginLeft: space.sm, color: color.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.gutter, paddingVertical: space.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: space.md },
});

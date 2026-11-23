import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  AppText,
  Avatar,
  Button,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  space,
} from '../design';
import { useFollowMutation, useSearchAthletes } from '../hooks/useAthletes';
import { AthleteSummary, toAthleteSummary } from '../lib/activityView';
import { captureFollowEpochs, commitServerFollow, useFollow } from '../lib/social';

type Row = AthleteSummary & { isFollowing: boolean; pending?: boolean };

const SearchFollowButton: React.FC<{
  row: Row;
  onFollow: (row: Row) => void;
  loading?: boolean;
}> = ({ row, onFollow, loading }) => {
  const isFollowing = useFollow(row.id, row.isFollowing);
  return (
    <Button
      label={isFollowing ? 'Following' : 'Follow'}
      size="sm"
      variant={isFollowing ? 'outline' : 'primary'}
      icon={isFollowing ? 'checkmark' : 'person-add-outline'}
      loading={loading}
      onPress={() => onFollow({ ...row, isFollowing })}
    />
  );
};

export default function SearchScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const tooShort = query.trim().length < 2;
  const { data: rawAthletes = [], isLoading, isError } = useSearchAthletes(query, !tooShort);
  const followMutation = useFollowMutation();

  const rows: Row[] = useMemo(() => {
    if (tooShort) return [];
    const snapshot = captureFollowEpochs();
    return rawAthletes
      .filter((a: any) => a.id !== currentUser.id)
      .map((a: any) => ({
        ...toAthleteSummary(a),
        isFollowing: commitServerFollow(a.id, Boolean(a.isFollowing), snapshot),
      }));
  }, [rawAthletes, currentUser.id, tooShort]);

  const onFollow = async (row: Row) => {
    setPendingId(row.id);
    try {
      await followMutation.mutateAsync({
        athleteId: row.id,
        follow: !row.isFollowing,
      });
    } catch {
      // Ignored
    } finally {
      setPendingId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View className="flex-row items-center px-2 py-2 border-b border-gray-100">
        <IconButton icon="arrow-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <View className="flex-1 flex-row items-center h-11 ml-1 pl-3 rounded-full bg-gray-100">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search athletes by name or city"
            placeholderTextColor="#9CA3AF"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search athletes"
            className="flex-1 ml-2 text-base text-gray-900 py-0"
          />
          {query.length > 0 ? (
            <IconButton
              icon="close-circle"
              size={32}
              iconColor="#9CA3AF"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
            />
          ) : null}
        </View>
      </View>

      {tooShort ? (
        <EmptyState
          icon="search"
          title="Search the community"
          description="Type at least 2 characters to search for athletes by name or city."
        />
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FC4C02" size="large" />
        </View>
      ) : isError ? (
        <ErrorState message="Could not complete the search. Check your connection." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No athletes found"
          description={`No results for "${query}". Try a different spelling or city.`}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              className="flex-row items-center px-4 py-3 active:bg-gray-50"
            >
              <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />
              <View className="flex-1 ml-3 mr-2">
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {item.displayName}
                </AppText>
                {item.city ? (
                  <AppText variant="caption" color="inkSecondary" numberOfLines={1}>
                    {item.city}
                  </AppText>
                ) : null}
              </View>
              <SearchFollowButton
                row={item}
                onFollow={onFollow}
                loading={pendingId === item.id}
              />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

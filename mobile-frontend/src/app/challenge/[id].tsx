import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';
import { useApp } from '../../context/AppContext';
import {
  useChallengeDetail,
  useDeleteChallenge,
  useToggleJoinChallenge,
} from '../../hooks/useGroups';
import { shareChallenge } from '../../lib/share';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useApp();

  const { data, isLoading, isError, error, refetch, isRefetching } = useChallengeDetail(id);
  const { mutate: toggleJoin, isPending: joining } = useToggleJoinChallenge();
  const { mutate: deleteChallenge } = useDeleteChallenge();

  const challenge = data?.challenge;
  const leaderboard = data?.leaderboard ?? [];

  if (isLoading || (!challenge && !isError)) {
    return (
      <SafeAreaView
        edges={['top']}
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Loading challenge...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !challenge) {
    return (
      <SafeAreaView
        edges={['top']}
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
          Couldn’t load this challenge
        </Text>
        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          {error?.message ?? 'Could not load this challenge.'}
        </Text>
        <TouchableOpacity onPress={() => refetch()} className="mt-3 px-5 py-2.5">
          <Text style={{ color: '#FC4C02', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const targetKm = (Number(challenge.targetMeters) || 0) / 1000;
  const currentKm = (Number(challenge.currentMeters) || 0) / 1000;
  const progressPercent =
    targetKm > 0 ? Math.min(100, Math.round((currentKm / targetKm) * 100)) : 0;

  const handleToggleJoin = () => {
    if (joining || !challenge) return;
    toggleJoin(
      { id: challenge.id, join: !challenge.isJoined },
      {
        onError: (e: any) =>
          Alert.alert('Couldn’t update challenge', e?.message ?? 'Please try again.'),
      }
    );
  };

  const confirmDelete = () => {
    Alert.alert('Delete this challenge?', 'Participants will lose access. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteChallenge(challenge.id, {
            onSuccess: () => router.replace('/(tabs)/groups'),
            onError: (e: any) =>
              Alert.alert('Couldn’t delete challenge', e?.message ?? 'Please try again.'),
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Bar */}
      <View
        style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
        className="px-4 py-3 flex-row items-center justify-between"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="p-1 -ml-1"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          className="text-base font-bold text-gray-900 flex-1 mx-3 text-center"
        >
          {challenge.title}
        </Text>
        <View className="flex-row items-center">
          {challenge.creatorId && challenge.creatorId === currentUser?.id ? (
            <TouchableOpacity onPress={confirmDelete} className="p-1 mr-2">
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => shareChallenge(challenge.id, challenge.title)}
            accessibilityLabel="Share"
            className="p-1 -mr-1"
          >
            <Ionicons name="share-social-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
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
        {/* Hero Section */}
        <View
          style={{ backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
          className="p-6 items-center"
        >
          {challenge.badgeUrl ? (
            <Image
              source={{ uri: challenge.badgeUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
              className="mb-4"
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#FEF3C7' }}
              className="items-center justify-center mb-4"
            >
              <Ionicons name="trophy" size={44} color="#F59E0B" />
            </View>
          )}
          <Text className="text-2xl font-black text-gray-900 text-center tracking-tight mb-1">
            {challenge.title}
          </Text>
          <View className="flex-row items-center mb-4">
            <View className="bg-gray-200 rounded-full px-3 py-0.5 mr-2">
              <Text className="text-xs font-semibold text-gray-700">{challenge.sportType}</Text>
            </View>
            <Text className="text-xs font-semibold text-gray-500">
              {challenge.daysRemaining > 0
                ? `${challenge.daysRemaining} days left`
                : 'Challenge ended'}
            </Text>
          </View>

          {/* Join / Leave CTA */}
          <TouchableOpacity
            onPress={handleToggleJoin}
            disabled={joining}
            style={{
              backgroundColor: challenge.isJoined ? '#E5E7EB' : '#FC4C02',
              width: '100%',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            {joining ? (
              <ActivityIndicator color={challenge.isJoined ? '#111827' : '#FFFFFF'} />
            ) : (
              <Text
                style={{
                  color: challenge.isJoined ? '#111827' : '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                {challenge.isJoined ? 'Leave Challenge' : 'Join Challenge'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Challenge Stats */}
        <View
          style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
          className="flex-row divide-x divide-gray-100 bg-white"
        >
          <StatBox label="Target" value={`${targetKm.toFixed(0)} km`} />
          <StatBox label="Participants" value={String(challenge.participantsCount)} />
          <StatBox
            label="Remaining"
            value={challenge.daysRemaining > 0 ? `${challenge.daysRemaining}d` : 'Ended'}
          />
        </View>

        {/* Progress (if joined) */}
        {challenge.isJoined ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}
            className="p-5"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-gray-900">Your Progress</Text>
              <Text className="text-xs font-bold text-[#FC4C02]">{progressPercent}%</Text>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <View
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: challenge.isCompleted ? '#10B981' : '#FC4C02',
                }}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">
                {currentKm.toFixed(1)} km of {targetKm.toFixed(0)} km
              </Text>
              {challenge.isCompleted ? (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text className="text-xs font-bold text-emerald-600 ml-1">Completed!</Text>
                </View>
              ) : (
                <Text className="text-xs text-gray-500">
                  {Math.max(0, targetKm - currentKm).toFixed(1)} km to go
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Overview Description */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
          className="p-5"
        >
          <Text className="text-sm font-bold text-gray-900 mb-2">Overview</Text>
          <Text className="text-sm text-gray-600 leading-relaxed">
            {challenge.description ||
              `Record ${challenge.sportType.toLowerCase()} activities to reach the ${targetKm.toFixed(0)} km goal. Every qualifying effort moves you up the leaderboard.`}
          </Text>
        </View>

        {/* Creator Controls */}
        {challenge.creatorId && challenge.creatorId === currentUser?.id ? (
          <View className="p-5 border-b border-gray-100 bg-white">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Creator Controls
            </Text>
            <View className="flex-row mb-3">
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-xl items-center border border-gray-300 bg-white mr-2"
                onPress={() =>
                  router.push({ pathname: '/challenge/create', params: { editId: challenge.id } })
                }
              >
                <Text className="text-xs font-bold text-gray-900">Edit Challenge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2.5 rounded-xl items-center border border-red-300 bg-white"
                onPress={confirmDelete}
              >
                <Text className="text-xs font-bold text-red-600">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Leaderboard Section */}
        <View className="p-5 bg-white">
          <Text className="text-sm font-bold text-gray-900 mb-3">Leaderboard</Text>
          {leaderboard.length === 0 ? (
            <View className="py-8 items-center">
              <Ionicons name="podium-outline" size={36} color="#D1D5DB" />
              <Text className="text-xs text-gray-400 mt-2 font-medium">
                No participants on the leaderboard yet.
              </Text>
            </View>
          ) : (
            leaderboard.map((entry: any, index: number) => {
              const km = (Number(entry.currentMeters) || 0) / 1000;
              const isTop3 = index < 3;
              const rankColor =
                index === 0
                  ? '#F59E0B'
                  : index === 1
                    ? '#9CA3AF'
                    : index === 2
                      ? '#B45309'
                      : '#6B7280';

              return (
                <View
                  key={entry.athleteId ?? String(index)}
                  style={{ borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}
                  className="flex-row items-center py-3"
                >
                  <View style={{ width: 28 }} className="items-center mr-2">
                    {isTop3 ? (
                      <Ionicons name="trophy" size={16} color={rankColor} />
                    ) : (
                      <Text className="text-xs font-bold text-gray-400">{index + 1}</Text>
                    )}
                  </View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#E5E7EB',
                    }}
                    className="items-center justify-center mr-3 overflow-hidden"
                  >
                    {entry.athlete?.avatarUrl ? (
                      <Image
                        source={{ uri: entry.athlete.avatarUrl }}
                        style={{ width: 36, height: 36 }}
                      />
                    ) : (
                      <Ionicons name="person" size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      {entry.athlete?.displayName || entry.athlete?.username || 'Athlete'}
                    </Text>
                    {entry.isCompleted ? (
                      <Text className="text-[10px] font-semibold text-emerald-600">Completed</Text>
                    ) : null}
                  </View>
                  <Text className="text-sm font-black text-gray-900">{km.toFixed(1)} km</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

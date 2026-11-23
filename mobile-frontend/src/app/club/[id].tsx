import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { useApp } from '../../context/AppContext';
import { useClubDetail, useDeleteClub, useToggleJoinClub } from '../../hooks/useGroups';
import { shareClub } from '../../lib/share';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'LEADERBOARD' | 'ABOUT'>('LEADERBOARD');

  const { data, isLoading, isError, error, refetch, isRefetching } = useClubDetail(id);
  const { mutate: toggleJoin, isPending: joining } = useToggleJoinClub();
  const { mutate: deleteClub } = useDeleteClub();

  const club = data?.club;
  const weeklyLeaderboard = data?.weeklyLeaderboard ?? [];

  if (isLoading || (!club && !isError)) {
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
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Loading club...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !club) {
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
          Couldn’t load this club
        </Text>
        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          {error?.message ?? 'Could not load this club.'}
        </Text>
        <TouchableOpacity onPress={() => refetch()} className="mt-3 px-5 py-2.5">
          <Text style={{ color: '#FC4C02', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwnerOrAdmin = club.userRole === 'OWNER' || club.userRole === 'ADMIN';

  const handleToggleMembership = () => {
    if (joining || !club) return;
    toggleJoin(
      { id: club.id, join: !club.isMember },
      {
        onError: (e: any) =>
          Alert.alert('Couldn’t update membership', e?.message ?? 'Please try again.'),
      }
    );
  };

  const confirmDelete = () => {
    Alert.alert('Delete this club?', 'Members will lose access. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteClub(club.id, {
            onSuccess: () => router.replace('/(tabs)/groups'),
            onError: (e: any) =>
              Alert.alert('Couldn’t delete the club', e?.message ?? 'Please try again.'),
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Header */}
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
          {club.name}
        </Text>
        <TouchableOpacity
          onPress={() => shareClub(club.id, club.name)}
          accessibilityLabel="Share"
          className="p-1 -mr-1"
        >
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
        {/* Banner + Avatar */}
        <View className="relative">
          {club.bannerUrl ? (
            <Image
              source={{ uri: club.bannerUrl }}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: '100%', height: 160, backgroundColor: '#E5E7EB' }} />
          )}

          <View className="absolute -bottom-8 left-5">
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                padding: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {club.avatarUrl ? (
                <Image
                  source={{ uri: club.avatarUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 13 }}
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 13,
                    backgroundColor: '#F3F4F6',
                  }}
                  className="items-center justify-center"
                >
                  <Ionicons name="shield-outline" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Club Info Section */}
        <View className="pt-11 px-5 pb-5">
          <Text className="text-2xl font-black text-gray-900 tracking-tight mb-1">{club.name}</Text>
          <View className="flex-row items-center flex-wrap mb-4">
            <Text className="text-xs font-semibold text-gray-500 mr-2">{club.sportType}</Text>
            {club.city ? (
              <>
                <Text className="text-xs text-gray-400 mr-2">•</Text>
                <Text className="text-xs font-semibold text-gray-500 mr-2">{club.city}</Text>
              </>
            ) : null}
            <Text className="text-xs text-gray-400 mr-2">•</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/club/members', params: { id: club.id } })}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-bold text-[#FC4C02]">
                {club.memberCount} {club.memberCount === 1 ? 'member' : 'members'} ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action CTAs: Join / Leave / Manage */}
          {isOwnerOrAdmin ? (
            <View className="flex-row mb-2">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center border border-gray-300 bg-white mr-2"
                onPress={() =>
                  router.push({ pathname: '/club/create', params: { editId: club.id } })
                }
              >
                <Text className="text-sm font-bold text-gray-900">Edit club</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center border border-red-300 bg-white"
                onPress={confirmDelete}
              >
                <Text className="text-sm font-bold text-red-600">Delete club</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              disabled={joining}
              className={`py-3 rounded-xl items-center border ${
                club.isMember ? 'bg-white border-gray-300' : 'bg-[#FC4C02] border-[#FC4C02]'
              }`}
              onPress={handleToggleMembership}
            >
              {joining ? (
                <ActivityIndicator size="small" color={club.isMember ? '#111827' : '#FFFFFF'} />
              ) : (
                <Text
                  className={`text-sm font-bold ${club.isMember ? 'text-gray-900' : 'text-white'}`}
                >
                  {club.isMember ? 'Leave Club' : 'Join Club'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-Navigation Tabs */}
        <View className="flex-row border-b border-gray-200 px-5 bg-white">
          <TouchableOpacity
            onPress={() => setActiveSubTab('LEADERBOARD')}
            className="mr-6 py-3 items-center"
          >
            <Text
              className={`text-xs font-bold ${
                activeSubTab === 'LEADERBOARD' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              Leaderboard
            </Text>
            {activeSubTab === 'LEADERBOARD' ? (
              <View className="h-0.5 w-full bg-[#FC4C02] mt-2 rounded-full" />
            ) : (
              <View className="h-0.5 mt-2" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSubTab('ABOUT')}
            className="mr-6 py-3 items-center"
          >
            <Text
              className={`text-xs font-bold ${
                activeSubTab === 'ABOUT' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              About
            </Text>
            {activeSubTab === 'ABOUT' ? (
              <View className="h-0.5 w-full bg-[#FC4C02] mt-2 rounded-full" />
            ) : (
              <View className="h-0.5 mt-2" />
            )}
          </TouchableOpacity>
        </View>

        {/* Sub-Tab Content */}
        {activeSubTab === 'LEADERBOARD' ? (
          <View className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-bold text-gray-900">This Week</Text>
              <Text className="text-xs font-semibold text-gray-400">Total Distance</Text>
            </View>

            {weeklyLeaderboard.length === 0 ? (
              <View className="py-8 items-center">
                <Ionicons name="podium-outline" size={36} color="#D1D5DB" />
                <Text className="text-xs text-gray-400 mt-2 font-medium">
                  No activity recorded this week yet.
                </Text>
              </View>
            ) : (
              weeklyLeaderboard.map((entry: any, index: number) => {
                const isTop3 = index < 3;
                const rankColor =
                  index === 0
                    ? '#F59E0B'
                    : index === 1
                      ? '#9CA3AF'
                      : index === 2
                        ? '#B45309'
                        : '#6B7280';
                const distKm = ((entry.distanceMeters || 0) / 1000).toFixed(1);

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
                    <Text className="text-sm font-bold text-gray-900 flex-1">
                      {entry.athlete?.displayName || entry.athlete?.username || 'Member'}
                    </Text>
                    <Text className="text-sm font-black text-gray-900">{distKm} km</Text>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View className="p-5">
            <Text className="text-sm font-bold text-gray-900 mb-2">Description</Text>
            <Text className="text-sm text-gray-600 leading-relaxed mb-6">
              {club.description || 'No description provided for this club yet.'}
            </Text>

            <Text className="text-sm font-bold text-gray-900 mb-2">Club Details</Text>
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row justify-between py-1.5 border-b border-gray-100">
                <Text className="text-xs text-gray-500 font-medium">Sport</Text>
                <Text className="text-xs text-gray-900 font-bold">{club.sportType}</Text>
              </View>
              <View className="flex-row justify-between py-1.5 border-b border-gray-100">
                <Text className="text-xs text-gray-500 font-medium">Location</Text>
                <Text className="text-xs text-gray-900 font-bold">{club.city || 'Global'}</Text>
              </View>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-xs text-gray-500 font-medium">Access</Text>
                <Text className="text-xs text-gray-900 font-bold">
                  {club.isPrivate ? 'Invite Only' : 'Public'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

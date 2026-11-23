import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClubDetail } from '../../hooks/useGroups';
import { shareClub } from '../../lib/share';

export default function ClubMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch, error } = useClubDetail(id);

  const members = data?.members ?? [];
  const clubName = data?.club?.name ?? 'this club';

  const filtered = members.filter(
    (m: any) =>
      (m.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Members ({members.length})</Text>
        <TouchableOpacity
          onPress={() => id && shareClub(id, clubName)}
          className="p-1"
        >
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search members"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Members List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#FC4C02"
          />
        }
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#FC4C02" />
          </View>
        ) : error ? (
          <View className="py-20 items-center px-6">
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text className="text-sm font-semibold text-gray-800 mt-2 text-center">
              {(error as any)?.message ?? 'Could not load members'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                void refetch();
              }}
              className="mt-4 px-4 py-2 bg-gray-900 rounded-full"
            >
              <Text className="text-xs font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-20 items-center">
            <Text className="text-sm text-gray-400">No members found</Text>
          </View>
        ) : (
          <View className="bg-white">
            {filtered.map((member: any) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => router.push(`/athlete/${member.id}`)}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-gray-50 active:bg-gray-50"
              >
                <View className="flex-row items-center flex-1">
                  <Image
                    source={{
                      uri:
                        member.profilePictureUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'User')}&background=random`,
                    }}
                    className="w-11 h-11 rounded-full bg-gray-200"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-gray-900">
                      {member.displayName}
                    </Text>
                    {member.city ? (
                      <Text className="text-xs text-gray-500 mt-0.5">{member.city}</Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

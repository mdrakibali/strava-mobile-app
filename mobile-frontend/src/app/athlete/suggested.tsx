import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useFollowMutation, useSearchAthletes } from '../../hooks/useAthletes';
import { captureFollowEpochs, commitServerFollow, useFollow } from '../../lib/social';

const SuggestedAthlete: React.FC<{
  athlete: any;
  onOpen: () => void;
  onMessage: () => void;
  onToggle: (currentlyFollowing: boolean) => void;
  isPending?: boolean;
}> = ({ athlete, onOpen, onMessage, onToggle, isPending }) => {
  const isFollowing = useFollow(athlete.id, Boolean(athlete.isFollowing));
  return (
    <View className="p-4 bg-white rounded-2xl mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <TouchableOpacity onPress={onOpen} className="flex-row items-center flex-1 mr-3">
          <Image
            source={{ uri: athlete.avatarUrl || undefined }}
            className="w-14 h-14 rounded-full mr-3 bg-gray-100"
          />
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
            <Text className="text-xs text-gray-400">@{athlete.username || 'athlete'}</Text>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="location-outline" size={11} color="#FC4C02" />
              <Text className="text-[11px] text-[#FC4C02] font-semibold ml-0.5">
                {athlete.city || 'Dhaka'} · Community Runner
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={onMessage}
            className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-2"
          >
            <Ionicons name="chatbubble-outline" size={15} color="#FC4C02" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onToggle(isFollowing)}
            disabled={isPending}
            className={`px-4 py-1.5 rounded-full ${isFollowing ? 'bg-gray-100' : 'bg-[#FC4C02]'}`}
          >
            <Text className={`text-xs font-bold ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
              {isFollowing ? 'Following' : 'Follow +'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {athlete.bio ? (
        <Text className="text-xs text-gray-600 leading-4 mt-1 border-t border-gray-50 pt-2">
          {athlete.bio}
        </Text>
      ) : null}
    </View>
  );
};

export default function SuggestedAthletesScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { data: rawAthletes = [], isLoading, isRefetching, refetch } = useSearchAthletes('');
  const followMutation = useFollowMutation();

  const suggested = useMemo(() => {
    const snapshot = captureFollowEpochs();
    return rawAthletes
      .filter((a: any) => a.id !== currentUser?.id)
      .map((a: any) => ({
        ...a,
        isFollowing: commitServerFollow(a.id, Boolean(a.isFollowing), snapshot),
      }));
  }, [rawAthletes, currentUser?.id]);

  const toggleFollow = async (id: string, currentlyFollowing: boolean) => {
    try {
      await followMutation.mutateAsync({ athleteId: id, follow: !currentlyFollowing });
    } catch (err) {
      console.warn('Follow error:', err);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Suggested Athletes</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
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
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#FC4C02" />
            </View>
          ) : suggested.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text className="text-sm font-semibold text-gray-400 mt-2">
                No suggested athletes right now
              </Text>
            </View>
          ) : (
            suggested.map((athlete) => (
              <SuggestedAthlete
                key={athlete.id}
                athlete={athlete}
                onOpen={() => router.push(`/athlete/${athlete.id}`)}
                onMessage={() => router.push(`/messages/${athlete.id}`)}
                onToggle={(isFollowing) => toggleFollow(athlete.id, isFollowing)}
                isPending={followMutation.isPending}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

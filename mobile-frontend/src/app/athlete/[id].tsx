import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityCard } from '../../components/common/ActivityCard';
import { StatBox } from '../../components/common/StatBox';
import { MOCK_ACTIVITIES, MOCK_ATHLETES } from '../../mock/data';

export default function AthleteProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const athlete = MOCK_ATHLETES.find((a) => a.id === id) || MOCK_ATHLETES[0];
  const [isFollowing, setIsFollowing] = useState(athlete.isFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(athlete.followersCount);

  // Filter activities for this athlete
  const athleteActivities = MOCK_ACTIVITIES.filter((a) => a.athlete.id === athlete.id);

  const handleToggleFollow = () => {
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((prev) => prev - 1);
    } else {
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      `Athlete Options: @${athlete.username}`,
      'Choose an action:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report Inappropriate Profile', style: 'destructive', onPress: () => router.push('/settings/report') },
        { text: 'Block Athlete', style: 'destructive', onPress: () => alert(`Blocked @${athlete.username}`) },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">{athlete.displayName}</Text>
        <TouchableOpacity onPress={handleMoreOptions} className="p-1">
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* Profile Card */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <Image
              source={{ uri: athlete.avatarUrl }}
              className="w-18 h-18 rounded-full border-2 border-[#FC4C02] bg-gray-100"
            />
            <TouchableOpacity
              onPress={handleToggleFollow}
              className={`px-6 py-2 rounded-full shadow-sm ${
                isFollowing ? 'bg-gray-100' : 'bg-[#FC4C02]'
              }`}>
              <Text className={`text-xs font-black ${isFollowing ? 'text-gray-800' : 'text-white'}`}>
                {isFollowing ? 'Following' : 'Follow +'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-black text-gray-900">{athlete.displayName}</Text>
          <Text className="text-xs font-semibold text-[#FC4C02] mb-1">@{athlete.username}</Text>
          <Text className="text-xs text-gray-400 mb-2">📍 {athlete.city}, {athlete.country}</Text>

          {athlete.bio && (
            <Text className="text-xs text-gray-600 leading-4 mb-4">{athlete.bio}</Text>
          )}

          {/* Social Stats */}
          <View className="flex-row justify-around border-t border-gray-100 pt-3">
            <TouchableOpacity
              onPress={() => router.push('/athlete/followers')}
              className="items-center">
              <Text className="text-base font-black text-gray-900">{followerCount}</Text>
              <Text className="text-xs text-gray-400">Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/athlete/following')}
              className="items-center">
              <Text className="text-base font-black text-gray-900">{athlete.followingCount}</Text>
              <Text className="text-xs text-gray-400">Following</Text>
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-base font-black text-gray-900">{athleteActivities.length}</Text>
              <Text className="text-xs text-gray-400">Activities</Text>
            </View>
          </View>
        </View>

        {/* 4-Week Volume Summary */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">Last 4 Weeks Volume</Text>
          <View className="flex-row justify-between">
            <StatBox label="Distance" value="128.4 km" />
            <StatBox label="Time" value="11h 20m" />
            <StatBox label="Elev Gain" value="1,420 m" />
          </View>
        </View>

        {/* Public Activity Feed */}
        <View className="mt-3 px-4">
          <Text className="text-sm font-black text-gray-900 mb-3">Recent Activities</Text>
          {athleteActivities.length > 0 ? (
            athleteActivities.map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
              />
            ))
          ) : (
            <View className="bg-white p-8 rounded-2xl items-center border border-gray-100">
              <Ionicons name="barbell-outline" size={32} color="#9CA3AF" />
              <Text className="text-xs font-bold text-gray-400 mt-2">No public workouts posted yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BestEffortsSection } from '../../components/activity/BestEffortsSection';
import { ActivityCard } from '../../components/common/ActivityCard';
import { StatBox } from '../../components/common/StatBox';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Activity, Athlete } from '../../types';

export default function AthleteProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const athleteId = Array.isArray(id) ? id[0] : id;
  const { toggleKudos, addComment } = useApp();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!athleteId) return;

    let isMounted = true;
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const res = await api.athletes.getProfile(athleteId);
        if (isMounted && res.athlete) {
          setAthlete({
            id: res.athlete.id,
            displayName: res.athlete.displayName,
            username: res.athlete.username,
            avatarUrl: res.athlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
            city: res.athlete.city || 'Dhaka',
            country: res.athlete.country || 'Bangladesh',
            bio: res.athlete.bio || '',
            followersCount: res.athlete.followersCount || 0,
            followingCount: res.athlete.followingCount || 0,
            isFollowing: Boolean(res.athlete.isFollowing),
          });
          setIsFollowing(Boolean(res.athlete.isFollowing));
          setFollowerCount(res.athlete.followersCount || 0);

          if (res.recentActivities) {
            setActivities(
              res.recentActivities.map((act: any) => {
                const distKm = (Number(act.distanceMeters) / 1000).toFixed(2);
                const mins = Math.floor(act.movingTimeSeconds / 60);
                const secs = act.movingTimeSeconds % 60;
                return {
                  id: act.id,
                  athlete: {
                    id: res.athlete.id,
                    displayName: res.athlete.displayName,
                    username: res.athlete.username,
                    avatarUrl: res.athlete.avatarUrl,
                    city: res.athlete.city,
                    country: res.athlete.country,
                    followersCount: res.athlete.followersCount,
                    followingCount: res.athlete.followingCount,
                  },
                  title: act.title,
                  description: act.description,
                  sportType: act.sportType,
                  visibility: act.visibility,
                  startTime: act.startTime,
                  distanceMeters: Number(act.distanceMeters),
                  movingTimeSeconds: act.movingTimeSeconds,
                  elapsedTimeSeconds: act.elapsedTimeSeconds,
                  elevationGainMeters: act.elevationGainMeters,
                  averageSpeedMps: act.averageSpeedMps ? Number(act.averageSpeedMps) : null,
                  maxSpeedMps: act.maxSpeedMps ? Number(act.maxSpeedMps) : null,
                  averageHeartRate: act.averageHeartRate,
                  distanceFormatted: `${distKm} km`,
                  movingTimeFormatted: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
                  paceFormatted: act.gapFormatted || '5:00 /km',
                  elevationFormatted: `${act.elevationGainMeters} m`,
                  kudosCount: 0,
                  hasKudos: false,
                  commentsCount: 0,
                  routePoints: act.maskedPolyline || [],
                };
              })
            );
          }
        }
      } catch (err) {
        console.warn('Load athlete profile error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  const handleToggleFollow = () => {
    if (!athleteId) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
    } else {
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    }
    api.athletes.toggleFollow(athleteId).catch(console.warn);
  };

  const handleMoreOptions = () => {
    if (!athlete) return;
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

  if (isLoading || !athlete) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text className="text-gray-500 text-xs mt-3">Loading athlete profile...</Text>
      </SafeAreaView>
    );
  }

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
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.push('/messages')}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-2 border border-gray-200">
                <Ionicons name="chatbubble-outline" size={18} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleFollow}
                className={`px-5 py-2 rounded-full flex-row items-center ${
                  isFollowing ? 'bg-gray-100 border border-gray-300' : 'bg-[#FC4C02]'
                }`}>
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'person-add'}
                  size={14}
                  color={isFollowing ? '#374151' : '#FFFFFF'}
                />
                <Text
                  className={`text-xs font-bold ml-1.5 ${
                    isFollowing ? 'text-gray-700' : 'text-white'
                  }`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-xl font-black text-gray-900">{athlete.displayName}</Text>
          <Text className="text-sm text-[#FC4C02] font-semibold mt-0.5">@{athlete.username}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text className="text-xs text-gray-500 ml-1">{athlete.city}, {athlete.country}</Text>
          </View>
          {athlete.bio ? <Text className="text-xs text-gray-700 mt-2 leading-relaxed">{athlete.bio}</Text> : null}

          {/* Social Counts */}
          <View className="flex-row items-center mt-4 pt-3 border-t border-gray-100">
            <View className="flex-row items-center mr-4">
              <Text className="text-sm font-black text-gray-900 mr-1">{followerCount}</Text>
              <Text className="text-xs text-gray-500">Followers</Text>
            </View>
            <View className="flex-row items-center mr-4">
              <Text className="text-sm font-black text-gray-900 mr-1">{athlete.followingCount}</Text>
              <Text className="text-xs text-gray-500">Following</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm font-black text-gray-900 mr-1">{activities.length}</Text>
              <Text className="text-xs text-gray-500">Activities</Text>
            </View>
          </View>
        </View>

        {/* 4-Week Activity Summary */}
        <View className="bg-white mt-2 p-4 border-y border-gray-200">
          <Text className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">
            Recent Fitness Stats
          </Text>
          <View className="flex-row justify-between">
            <StatBox label="Workouts" value={String(activities.length)} />
            <StatBox
              label="Distance"
              value={`${(activities.reduce((acc, a) => acc + (a.distanceMeters || 0), 0) / 1000).toFixed(1)} km`}
            />
            <StatBox
              label="Moving Time"
              value={`${Math.round(activities.reduce((acc, a) => acc + (a.movingTimeSeconds || 0), 0) / 3600)}h`}
            />
          </View>
        </View>

        {/* Best Efforts Trophy Case */}
        <View className="bg-white mt-2 p-4 border-y border-gray-200">
          <BestEffortsSection />
        </View>

        {/* Recent Activities */}
        <View className="mt-2">
          <View className="bg-white px-4 py-3 border-b border-gray-200">
            <Text className="text-xs font-black uppercase text-gray-400 tracking-wider">
              Recent Activities ({activities.length})
            </Text>
          </View>
          {activities.length === 0 ? (
            <View className="bg-white p-8 items-center justify-center">
              <Ionicons name="bicycle-outline" size={36} color="#D1D5DB" />
              <Text className="text-gray-400 text-xs mt-2">No public activities yet</Text>
            </View>
          ) : (
            activities.map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
                onKudos={() => toggleKudos(act.id)}
                onComment={() => router.push(`/activity/${act.id}`)}
                onShare={() => router.push(`/share/${act.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

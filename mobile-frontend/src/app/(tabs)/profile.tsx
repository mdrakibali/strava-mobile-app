import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityCard } from '../../components/common/ActivityCard';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, activities, logout } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'progress' | 'activities' | 'more'>('progress');

  const userActivities = activities.filter((a) => a.athlete.id === currentUser.id);
  const totalMeters = userActivities.reduce((acc, a) => acc + (Number(a.distanceMeters) || 0), 0);
  const totalKm = (totalMeters / 1000).toFixed(1);
  const totalSeconds = userActivities.reduce((acc, a) => acc + (Number(a.movingTimeSeconds) || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const totalElevation = userActivities.reduce((acc, a) => acc + (Number(a.elevationGainMeters) || 0), 0);

  // Past 12 Weeks Simulated Data Points (Matching Screenshot 11)
  const past12WeeksData = [
    { week: 'W1', km: 18.2, heightPercent: 45 },
    { week: 'W2', km: 24.5, heightPercent: 60 },
    { week: 'W3', km: 21.0, heightPercent: 50 },
    { week: 'W4', km: 31.8, heightPercent: 78 },
    { week: 'W5', km: 28.4, heightPercent: 70 },
    { week: 'W6', km: 35.0, heightPercent: 88 },
    { week: 'W7', km: 22.1, heightPercent: 55 },
    { week: 'W8', km: 40.2, heightPercent: 100 },
    { week: 'W9', km: 36.5, heightPercent: 90 },
    { week: 'W10', km: 29.0, heightPercent: 72 },
    { week: 'W11', km: 33.4, heightPercent: 82 },
    { week: 'W12', km: 38.6, heightPercent: 95 },
  ];

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${currentUser.displayName}'s athletic profile on Open Strava!`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-black text-gray-900">You</Text>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => router.push('/search')} className="p-1 mr-3">
            <Ionicons name="search-outline" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} className="p-1 mr-3">
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Log Out', 'Are you sure you want to log out of your athlete profile?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out',
                  style: 'destructive',
                  onPress: async () => {
                    await logout();
                    router.replace('/auth/login');
                  },
                },
              ]);
            }}
            className="p-1">
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Profile Card matching Screenshot 11 */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: currentUser.avatarUrl }}
              className="w-16 h-16 rounded-full border-2 border-orange-500 bg-gray-100 mr-3.5"
            />
            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-xl font-black text-gray-900 mr-1.5">
                  {currentUser.displayName}
                </Text>
                <View className="bg-[#FC4C02] px-1.5 py-0.2 rounded">
                  <Text className="text-[9px] font-black text-white">PRO</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500">
                {currentUser.city || 'Dhaka'}, {currentUser.country || 'Bangladesh'}
              </Text>
            </View>
          </View>

          {/* Followers & Following Counts */}
          <View className="flex-row items-center space-x-4 mb-4">
            <TouchableOpacity onPress={() => router.push('/athlete/following')} className="mr-4">
              <Text className="text-xs text-gray-600">
                <Text className="font-black text-gray-900">{currentUser.followingCount || 24} </Text>
                Following
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/athlete/followers')}>
              <Text className="text-xs text-gray-600">
                <Text className="font-black text-gray-900">{currentUser.followersCount || 118} </Text>
                Followers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons: Edit Profile & Share Profile */}
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => router.push('/settings/profile-edit')}
              className="flex-1 py-2 bg-gray-100 rounded-xl items-center mr-2 border border-gray-200">
              <Text className="text-xs font-bold text-gray-800">Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareProfile}
              className="flex-1 py-2 bg-gray-100 rounded-xl items-center border border-gray-200">
              <Text className="text-xs font-bold text-gray-800">Share profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-Navigation Tabs: Progress, Activities, More */}
        <View className="flex-row bg-white border-b border-gray-200">
          {(['progress', 'activities', 'more'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveSubTab(tab)}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeSubTab === tab ? 'border-[#FC4C02]' : 'border-transparent'
              }`}>
              <Text
                className={`text-xs font-black uppercase tracking-wider ${
                  activeSubTab === tab ? 'text-[#FC4C02]' : 'text-gray-400'
                }`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab 1: Progress (12 Weeks Progression + Unlocked Analytics) */}
        {activeSubTab === 'progress' && (
          <View className="p-4 space-y-4">
            {/* 12-Week Progression Chart Card */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-xs font-bold text-gray-400 uppercase">
                    Past 12 Weeks
                  </Text>
                  <Text className="text-lg font-black text-gray-900">Training Progression</Text>
                </View>
                <View className="bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                  <Text className="text-xs font-black text-[#FC4C02]">348.6 km Total</Text>
                </View>
              </View>

              {/* Bar Chart Visualization */}
              <View className="h-32 flex-row items-end justify-between pt-4 pb-1 border-b border-gray-100">
                {past12WeeksData.map((d, index) => {
                  const isLatest = index === past12WeeksData.length - 1;
                  return (
                    <View key={d.week} className="items-center flex-1">
                      <View
                        style={{ height: `${d.heightPercent}%` }}
                        className={`w-4 rounded-t-sm ${
                          isLatest ? 'bg-[#FC4C02]' : 'bg-gray-300'
                        }`}
                      />
                      <Text className="text-[9px] font-bold text-gray-400 mt-1">
                        {d.week}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View className="flex-row justify-between items-center mt-2.5">
                <Text className="text-xs text-gray-500 font-medium">Avg: 29.0 km / week</Text>
                <Text className="text-xs font-bold text-emerald-600">Peak: 40.2 km</Text>
              </View>
            </View>

            {/* Weekly Target Goal Tracker */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-black text-gray-900">Weekly Mileage Goal</Text>
                <Text className="text-xs font-black text-[#FC4C02]">32.5 / 40.0 km</Text>
              </View>
              <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <View className="h-full bg-[#FC4C02] rounded-full" style={{ width: '81%' }} />
              </View>
              <Text className="text-[11px] text-gray-500">
                7.5 km remaining by Sunday to reach your target!
              </Text>
            </View>

            {/* Unlocked Pro Analytics Suite (100% Free on Open Strava) */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-sm font-black text-gray-900">
                    Subscriber Features
                  </Text>
                  <Text className="text-[10px] font-bold text-emerald-600">
                    100% Unlocked & Lifetime Free
                  </Text>
                </View>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-emerald-700">UNLOCKED</Text>
                </View>
              </View>

              <View className="space-y-2.5">
                {[
                  {
                    title: 'Fitness & Freshness',
                    desc: 'Track fitness (CTL), fatigue (ATL), and form (TSB) over time',
                    route: '/analytics/fitness-freshness',
                    icon: 'trending-up',
                  },
                  {
                    title: 'Relative Effort',
                    desc: 'Heart rate TRIMP cardio workload analysis for every workout',
                    route: '/analytics/relative-effort',
                    icon: 'flash',
                  },
                  {
                    title: 'Race Predictor',
                    desc: 'Projected 5K, 10K, Half Marathon, and Marathon times',
                    route: '/analytics/race-predictions',
                    icon: 'trophy',
                  },
                  {
                    title: 'Matched Activities',
                    desc: 'Compare pace & cadence automatically on recurring routes',
                    route: '/analytics/matched-activities',
                    icon: 'git-compare',
                  },
                  {
                    title: 'Personal & Global Heatmaps',
                    desc: 'Full 3D heat trace of every kilometer you have explored',
                    route: '/analytics/heatmap',
                    icon: 'flame',
                  },
                  {
                    title: 'Full Segment Leaderboards',
                    desc: 'Unrestricted ranking filters: Overall, Age Group, Weight & Clubs',
                    route: '/segments',
                    icon: 'podium',
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.title}
                    onPress={() => router.push(item.route as any)}
                    className="flex-row items-center p-3 bg-gray-50 rounded-xl active:bg-orange-50 border border-gray-100 mb-2">
                    <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center mr-3">
                      <Ionicons name={item.icon as any} size={18} color="#FC4C02" />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-black text-gray-900">{item.title}</Text>
                      <Text className="text-[10px] text-gray-500">{item.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: Activities (User's Recorded History) */}
        {activeSubTab === 'activities' && (
          <View className="p-3">
            {userActivities.length === 0 ? (
              <View className="bg-white p-8 rounded-2xl items-center border border-gray-200 mt-2">
                <Ionicons name="fitness-outline" size={40} color="#9CA3AF" />
                <Text className="text-sm font-bold text-gray-800 mt-2">No activities yet</Text>
                <Text className="text-xs text-gray-400 text-center mt-1">
                  Start recording a workout or add a manual entry to see your activities here.
                </Text>
              </View>
            ) : (
              userActivities.map((act) => <ActivityCard key={act.id} activity={act} />)
            )}
          </View>
        )}

        {/* Tab 3: More (Gear, Stats, Settings) */}
        {activeSubTab === 'more' && (
          <View className="p-4 space-y-3">
            <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 shadow-xs">
              <Text className="text-sm font-black text-gray-900 mb-3">Athletic Gear</Text>
              <TouchableOpacity
                onPress={() => router.push('/settings/gear' as any)}
                className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="footsteps-outline" size={18} color="#4B5563" />
                  <Text className="text-xs font-bold text-gray-800 ml-2">Running Shoes</Text>
                </View>
                <Text className="text-xs font-semibold text-gray-400">Nike Vaporfly (342 km) ›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/settings/gear' as any)}
                className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center">
                  <Ionicons name="bicycle-outline" size={18} color="#4B5563" />
                  <Text className="text-xs font-bold text-gray-800 ml-2">Bikes</Text>
                </View>
                <Text className="text-xs font-semibold text-gray-400">Trek Emonda SL 6 ›</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <Text className="text-sm font-black text-gray-900 mb-3">Account & Safety</Text>
              <TouchableOpacity
                onPress={() => router.push('/safety/beacon' as any)}
                className="flex-row items-center justify-between py-2.5 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FC4C02" />
                  <Text className="text-xs font-bold text-gray-800 ml-2">Strava Live Beacon</Text>
                </View>
                <Text className="text-[10px] font-bold text-emerald-600">Active (Free) ›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                className="flex-row items-center justify-between py-2.5">
                <View className="flex-row items-center">
                  <Ionicons name="cog-outline" size={18} color="#4B5563" />
                  <Text className="text-xs font-bold text-gray-800 ml-2">Settings & Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

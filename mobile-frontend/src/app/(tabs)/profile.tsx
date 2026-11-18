import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, activities } = useApp();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-black text-gray-900">Athlete Profile 👤</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} className="p-1">
          <Ionicons name="settings-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* Profile Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row justify-between items-start mb-3">
            <Image
              source={{ uri: currentUser.avatarUrl }}
              className="w-18 h-18 rounded-full border-2 border-[#FC4C02] bg-gray-100"
            />
            <TouchableOpacity
              onPress={() => router.push('/settings/profile-edit')}
              className="px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50">
              <Text className="text-xs font-bold text-gray-700">Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-black text-gray-900">{currentUser.displayName}</Text>
          <Text className="text-sm font-semibold text-[#FC4C02] mb-1">@{currentUser.username}</Text>
          <Text className="text-xs text-gray-400 mb-2">📍 {currentUser.city}, {currentUser.country}</Text>

          {currentUser.bio && (
            <Text className="text-xs text-gray-600 leading-4 mb-3">{currentUser.bio}</Text>
          )}

          {/* Followers / Following counts */}
          <View className="flex-row justify-around border-t border-gray-100 pt-3">
            <TouchableOpacity onPress={() => router.push('/athlete/followers')} className="items-center">
              <Text className="text-base font-black text-gray-900">{currentUser.followersCount}</Text>
              <Text className="text-xs text-gray-400">Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/athlete/following')} className="items-center">
              <Text className="text-base font-black text-gray-900">{currentUser.followingCount}</Text>
              <Text className="text-xs text-gray-400">Following</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-base font-black text-gray-900">{activities.length}</Text>
              <Text className="text-xs text-gray-400">Activities</Text>
            </View>
          </View>
        </View>

        {/* Advanced Fitness Hub Shortcut Pills */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-xs font-bold text-gray-500 uppercase mb-3">Analytics & Coaching</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: 'Training Log', path: '/analytics/training-log', icon: 'calendar-outline' },
              { label: 'Fitness & Freshness', path: '/analytics/fitness-freshness', icon: 'trending-up-outline' },
              { label: 'Relative Effort', path: '/analytics/relative-effort', icon: 'flash-outline' },
              { label: 'Race Predictor', path: '/analytics/race-predictions', icon: 'trophy-outline' },
              { label: 'Matched Efforts', path: '/analytics/matched-activities', icon: 'time-outline' },
              { label: 'Structured Plans', path: '/analytics/training-plans', icon: 'barbell-outline' },
            ].map((tool) => (
              <TouchableOpacity
                key={tool.label}
                onPress={() => router.push(tool.path as any)}
                className="flex-row items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                <Ionicons name={tool.icon as any} size={15} color="#FC4C02" />
                <Text className="text-xs font-bold text-gray-800 ml-1.5">{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4-Week Training Volume */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">Last 4 Weeks Volume</Text>
          <View className="flex-row justify-between">
            <StatBox label="Total Distance" value="164.2 km" />
            <StatBox label="Moving Time" value="14h 22m" />
            <StatBox label="Elevation Gain" value="1,840 m" />
          </View>
        </View>

        {/* Gear Tracking Preview */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-gray-900">Gear & Shoes</Text>
            <TouchableOpacity onPress={() => router.push('/gear')}>
              <Text className="text-xs font-bold text-[#FC4C02]">Manage Gear →</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
              <Ionicons name="footsteps-outline" size={20} color="#FC4C02" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900">Nike ZoomX Vaporfly 3</Text>
              <Text className="text-[10px] text-gray-400">342 / 500 km</Text>
              <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <View className="h-full bg-[#FC4C02] rounded-full w-[68%]" />
              </View>
            </View>
          </View>
        </View>

        {/* Trophy Case */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">Trophy Case 🏆</Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <View className="w-14 h-14 rounded-full bg-amber-50 items-center justify-center border-2 border-amber-300 mb-1">
                <Ionicons name="trophy" size={24} color="#D97706" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Nov 100k</Text>
            </View>
            <View className="items-center">
              <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-300 mb-1">
                <Ionicons name="medal" size={24} color="#2563EB" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Elevation 2000m</Text>
            </View>
            <View className="items-center">
              <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center border-2 border-orange-300 mb-1">
                <Ionicons name="ribbon" size={24} color="#FC4C02" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Gran Fondo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

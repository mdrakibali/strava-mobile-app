import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [kudosAlerts, setKudosAlerts] = useState(true);
  const [commentAlerts, setCommentAlerts] = useState(true);
  const [followerAlerts, setFollowerAlerts] = useState(true);
  const [clubAlerts, setClubAlerts] = useState(false);
  const [challengeAlerts, setChallengeAlerts] = useState(true);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Notifications</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Social Activity Alerts</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
          <View className="flex-row items-center justify-between py-1 mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Kudos on Your Activities</Text>
              <Text className="text-xs text-gray-500">When athletes like your workouts.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setKudosAlerts(!kudosAlerts)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                kudosAlerts ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${kudosAlerts ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-1 mb-3 border-t border-gray-50 pt-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Comments & Replies</Text>
              <Text className="text-xs text-gray-500">When someone comments or replies to your post.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setCommentAlerts(!commentAlerts)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                commentAlerts ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${commentAlerts ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-1 border-t border-gray-50 pt-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">New Followers</Text>
              <Text className="text-xs text-gray-500">When an athlete follows your profile.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setFollowerAlerts(!followerAlerts)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                followerAlerts ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${followerAlerts ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Community & Milestone Updates</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <View className="flex-row items-center justify-between py-1 mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Challenge Milestones</Text>
              <Text className="text-xs text-gray-500">Progress updates and unlocked trophies.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setChallengeAlerts(!challengeAlerts)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                challengeAlerts ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${challengeAlerts ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-1 border-t border-gray-50 pt-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Club Announcements</Text>
              <Text className="text-xs text-gray-500">New group events and weekly leaderboard posts.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setClubAlerts(!clubAlerts)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                clubAlerts ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${clubAlerts ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


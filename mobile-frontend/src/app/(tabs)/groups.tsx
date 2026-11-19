import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { ChallengesList } from '../../components/groups/ChallengesList';
import { ClubsList } from '../../components/groups/ClubsList';
import { EventsList } from '../../components/groups/EventsList';
import { useApp } from '../../context/AppContext';

export default function GroupsScreen() {
  const router = useRouter();
  const { clubs, challenges, events, toggleJoinClub, toggleJoinChallenge, toggleRsvp } = useApp();
  const [activeTab, setActiveTab] = useState<'challenges' | 'clubs' | 'events'>('challenges');
  const [hasJoinedNovemberChallenge, setHasJoinedNovemberChallenge] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Header title="STRAVA" />

      {/* 3 Tab Navigation Pills matching Strava: Challenges, Clubs, Events */}
      <View className="flex-row bg-white px-4 py-2 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveTab('challenges')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'challenges' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'challenges' ? 'text-white' : 'text-gray-700'
            }`}>
            Challenges ({challenges.length + 1})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('clubs')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'clubs' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'clubs' ? 'text-white' : 'text-gray-700'
            }`}>
            Clubs ({clubs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('events')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'events' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'events' ? 'text-white' : 'text-gray-700'
            }`}>
            Group Events ({events.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        className="px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 110 }}>
        {activeTab === 'challenges' && (
          <View>
            {/* November Elevation Challenge Hero Banner (matching Screenshot 10) */}
            <View className="bg-[#FFEB3B] rounded-2xl p-5 mb-4 shadow-sm border border-yellow-300 relative overflow-hidden">
              {/* Background mountain art decoration */}
              <View className="absolute right-0 bottom-0 opacity-20">
                <Ionicons name="triangle" size={140} color="#000000" />
              </View>

              <View className="flex-row justify-between items-start mb-2">
                <View className="bg-black/90 px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">
                    Featured Challenge
                  </Text>
                </View>
                <View className="flex-row items-center bg-white/80 px-2 py-0.5 rounded-full">
                  <Ionicons name="time-outline" size={12} color="#111" />
                  <Text className="text-[10px] font-bold text-gray-900 ml-1">11 days left</Text>
                </View>
              </View>

              <Text className="text-xl font-black text-gray-900 mt-1 mb-1">
                November Elevation Challenge
              </Text>
              <Text className="text-xs text-gray-800 leading-4 mb-4 font-medium">
                Climb 2,000 meters across your rides and runs this month to unlock the digital finisher badge.
              </Text>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="trending-up" size={18} color="#000000" />
                  <Text className="text-xs font-black text-gray-900 ml-1.5">2,000 m Target</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setHasJoinedNovemberChallenge((prev) => !prev)}
                  activeOpacity={0.8}
                  className={`px-6 py-2.5 rounded-full shadow-md ${
                    hasJoinedNovemberChallenge ? 'bg-black' : 'bg-[#FC4C02]'
                  }`}>
                  <Text className="text-xs font-black text-white">
                    {hasJoinedNovemberChallenge ? 'Joined ✓' : 'Join Challenge'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Group Challenges Creation (Strava Paid Feature - 100% Free & Unlocked) */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-4 shadow-xs">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-2.5">
                    <Ionicons name="trophy" size={16} color="#FC4C02" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-gray-900">Group Challenges</Text>
                    <Text className="text-[10px] text-emerald-600 font-bold">
                      Unlimited & Unlocked for All Athletes
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/challenge/create' as any)}
                  className="bg-black px-3.5 py-1.5 rounded-full">
                  <Text className="text-xs font-bold text-white">+ Create</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-gray-500 leading-4">
                Challenge up to 25 friends to complete a collective goal: Most Distance, Fastest Effort, or Most Active.
              </Text>
            </View>

            {/* Standard Challenges List */}
            <ChallengesList challenges={challenges} onToggleJoin={toggleJoinChallenge} />
          </View>
        )}

        {activeTab === 'clubs' && (
          <ClubsList clubs={clubs} onToggleJoin={toggleJoinClub} />
        )}

        {activeTab === 'events' && (
          <EventsList events={events} onToggleRsvp={toggleRsvp} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../context/AppContext';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clubs, toggleJoinClub } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'LEADERBOARD' | 'ABOUT'>('LEADERBOARD');

  const club = clubs.find((c) => c.id === id) || clubs[0];

  const clubLeaderboard = [
    { rank: 1, name: 'Tanvir Hossain', distance: '84.2 km', activities: 5, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { rank: 2, name: 'Elena Rostova', distance: '68.5 km', activities: 4, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { rank: 3, name: 'Rakib Ahmed (You)', distance: '42.8 km', activities: 3, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isYou: true },
    { rank: 4, name: 'Marcus Vance', distance: '38.0 km', activities: 2, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row justify-between items-center bg-white px-3 py-2 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900">{club.name}</Text>
        <TouchableOpacity className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Banner & Club Meta */}
        <Image source={{ uri: club.bannerUrl }} className="w-full h-32 bg-gray-100" />
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-center -mt-10 mb-2">
            <Image
              source={{ uri: club.avatarUrl }}
              className="w-16 h-16 rounded-full border-2 border-white bg-gray-100 mr-3"
            />
            <View className="flex-1 pt-6">
              <Text className="text-lg font-bold text-gray-900">{club.name}</Text>
              <Text className="text-xs text-gray-500">
                {club.sportType} · {club.city} · {club.memberCount} Athletes
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-600 leading-5 mb-3">{club.description}</Text>

          <TouchableOpacity
            className={`py-2 rounded-lg items-center border ${
              club.isMember
                ? 'bg-gray-100 border-gray-200'
                : 'bg-[#FC4C02] border-[#FC4C02]'
            }`}
            onPress={() => toggleJoinClub(club.id)}>
            <Text
              className={`text-sm font-bold ${
                club.isMember ? 'text-gray-700' : 'text-white'
              }`}>
              {club.isMember ? 'Member ✓ (Tap to Leave)' : 'Join Club'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sub-Tabs Switcher */}
        <View className="flex-row bg-white mt-2 border-b border-gray-200">
          <TouchableOpacity
            className={`flex-1 py-3 items-center border-b-2 ${
              activeSubTab === 'LEADERBOARD'
                ? 'border-[#FC4C02]'
                : 'border-transparent'
            }`}
            onPress={() => setActiveSubTab('LEADERBOARD')}>
            <Text
              className={`text-xs font-bold ${
                activeSubTab === 'LEADERBOARD' ? 'text-[#FC4C02]' : 'text-gray-500'
              }`}>
              Weekly Leaderboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3 items-center border-b-2 ${
              activeSubTab === 'ABOUT' ? 'border-[#FC4C02]' : 'border-transparent'
            }`}
            onPress={() => setActiveSubTab('ABOUT')}>
            <Text
              className={`text-xs font-bold ${
                activeSubTab === 'ABOUT' ? 'text-[#FC4C02]' : 'text-gray-500'
              }`}>
              About & Guidelines
            </Text>
          </TouchableOpacity>
        </View>

        {activeSubTab === 'LEADERBOARD' ? (
          <View className="p-4 gap-2">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Top Mileage This Week
            </Text>
            {clubLeaderboard.map((row) => (
              <View
                key={row.rank}
                className={`flex-row items-center p-3 rounded-xl border bg-white ${
                  row.isYou ? 'border-[#FC4C02] bg-[#FFF2EB]' : 'border-gray-200'
                }`}>
                <Text
                  className={`w-6 font-black text-center text-xs ${
                    row.rank === 1
                      ? 'text-amber-500'
                      : row.rank === 2
                      ? 'text-gray-400'
                      : row.rank === 3
                      ? 'text-amber-700'
                      : 'text-gray-500'
                  }`}>
                  #{row.rank}
                </Text>

                <Image source={{ uri: row.avatar }} className="w-9 h-9 rounded-full mx-2 bg-gray-100" />

                <View className="flex-1">
                  <Text className={`text-xs font-bold ${row.isYou ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
                    {row.name}
                  </Text>
                  <Text className="text-[10px] text-gray-400">{row.activities} workouts logged</Text>
                </View>

                <Text className="text-sm font-black text-gray-900 font-mono">{row.distance}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="p-4 gap-3 bg-white mt-2 border-y border-gray-200">
            <Text className="text-sm font-bold text-gray-900">Club Etiquette</Text>
            <Text className="text-xs text-gray-600 leading-5">
              1. All fitness levels and paces are welcome!{'\n'}
              2. Respect fellow athletes during group runs and peloton rides.{'\n'}
              3. Share kudos and cheer on your club teammates!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


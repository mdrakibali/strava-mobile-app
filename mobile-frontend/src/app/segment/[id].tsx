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
import { ElevationChart } from '../../components/common/ElevationChart';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { useApp } from '../../context/AppContext';

export default function SegmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { segments } = useApp();
  const [filter, setFilter] = useState<'OVERALL' | 'MEN' | 'WOMEN'>('OVERALL');

  const segment = segments.find((s) => s.id === id) || segments[0];

  const mockLeaderboard = [
    { rank: 1, name: segment.komAthleteName, time: segment.komTimeFormatted, speed: '21.4 km/h', date: 'Oct 14', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { rank: 2, name: 'Elena Rostova', time: '3:34', speed: '20.2 km/h', date: 'Nov 02', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { rank: 3, name: 'Marcus Vance', time: '3:40', speed: '19.6 km/h', date: 'Nov 12', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { rank: 4, name: 'Rakib Ahmed (You)', time: segment.userPrTimeFormatted || '3:45', speed: '19.2 km/h', date: 'Yesterday', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isYou: true },
    { rank: 5, name: 'Sophie Chen', time: '3:52', speed: '18.6 km/h', date: 'Nov 15', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center bg-white px-3 py-2 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900">Segment Details</Text>
        <TouchableOpacity className="p-1">
          <Ionicons name="star-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Title & Stats */}
        <View className="bg-white p-4 border-b border-gray-200">
          <Text className="text-xl font-black text-gray-900 mb-1">{segment.name}</Text>
          <Text className="text-xs text-gray-500 mb-3">
            {segment.sportType} Segment · {(segment.distanceMeters / 1000).toFixed(2)} km
          </Text>

          <View className="flex-row justify-between bg-gray-50 p-3 rounded-lg">
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">AVG GRADE</Text>
              <Text className="text-base font-black text-gray-900 mt-0.5">{segment.averageGradePercent}%</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">ELEV GAIN</Text>
              <Text className="text-base font-black text-gray-900 mt-0.5">+{segment.elevationGainMeters} m</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">YOUR RANK</Text>
              <Text className="text-base font-black text-[#FC4C02] mt-0.5">#{segment.rank || 4}</Text>
            </View>
          </View>
        </View>

        {/* Route & Elevation Preview */}
        <View className="bg-white p-4 border-y border-gray-200 mt-2">
          <RouteMapPreview points={segment.polylinePoints} height={160} />
          <View className="mt-2">
            <ElevationChart elevations={[10, 18, 32, 45, 62, 58, 40]} height={70} />
          </View>
        </View>

        {/* Unfiltered Leaderboard Section */}
        <View className="bg-white p-4 border-y border-gray-200 mt-2">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Segment Leaderboard (Full & Free)
            </Text>
          </View>

          {/* Filter Bar */}
          <View className="flex-row bg-gray-100 p-1 rounded-lg mb-3">
            {(['OVERALL', 'MEN', 'WOMEN'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                className={`flex-1 py-1.5 items-center rounded-md ${
                  filter === f ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => setFilter(f)}>
                <Text
                  className={`text-xs font-semibold ${
                    filter === f ? 'text-[#FC4C02]' : 'text-gray-600'
                  }`}>
                  {f === 'OVERALL' ? 'Overall' : f === 'MEN' ? 'Men' : 'Women'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Leaderboard Rows */}
          <View className="gap-2">
            {mockLeaderboard.map((row) => (
              <View
                key={row.rank}
                className={`flex-row items-center p-2.5 rounded-lg border ${
                  row.isYou
                    ? 'bg-[#FFF2EB] border-[#FC4C02]'
                    : 'bg-white border-gray-100'
                }`}>
                <Text
                  className={`w-6 font-black text-center text-xs ${
                    row.rank === 1
                      ? 'text-amber-500'
                      : row.rank === 2
                      ? 'text-gray-400'
                      : row.rank === 3
                      ? 'text-amber-700'
                      : 'text-gray-600'
                  }`}>
                  {row.rank === 1 ? '👑' : `#${row.rank}`}
                </Text>

                <Image source={{ uri: row.avatar }} className="w-8 h-8 rounded-full mx-2 bg-gray-100" />

                <View className="flex-1">
                  <Text className={`text-xs font-bold ${row.isYou ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
                    {row.name}
                  </Text>
                  <Text className="text-[10px] text-gray-400">{row.speed} · {row.date}</Text>
                </View>

                <Text className="text-sm font-black text-gray-900 font-mono">{row.time}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

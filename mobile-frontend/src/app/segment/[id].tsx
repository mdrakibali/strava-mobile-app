import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';

export default function SegmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { segments } = useApp();
  const [filter, setFilter] = useState<'OVERALL' | 'THIS MONTH' | 'FOLLOWING'>('OVERALL');
  const [isStarred, setIsStarred] = useState(false);

  const segment = segments.find((s) => s.id === id) || segments[0];

  const mockLeaderboard = [
    { rank: 1, name: segment.komAthleteName, time: segment.komTimeFormatted, speed: '21.4 km/h', date: 'Oct 14', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { rank: 2, name: 'Elena Rostova', time: '3:34', speed: '20.2 km/h', date: 'Nov 02', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { rank: 3, name: 'Marcus Vance', time: '3:40', speed: '19.6 km/h', date: 'Nov 12', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { rank: 4, name: 'Rakib Ahmed (You)', time: segment.userPrTimeFormatted || '3:45', speed: '19.2 km/h', date: 'Yesterday', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isYou: true },
    { rank: 5, name: 'Sophie Chen', time: '3:52', speed: '18.6 km/h', date: 'Nov 15', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
  ];

  const segCoords = segment.polylinePoints.map(
    (p) => [p.longitude, p.latitude] as [number, number]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center bg-white px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Segment Details</Text>
        <TouchableOpacity onPress={() => setIsStarred(!isStarred)} className="p-1">
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={22}
            color={isStarred ? '#FC4C02' : '#111827'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="pb-20">
        {/* Real Full-Featured Segment Map */}
        <View className="h-56 w-full border-b border-gray-200">
          <StravaMapView
            routeCoordinates={segCoords}
            showControls={false}
            showUserLocation={false}
            className="w-full h-full"
          />
        </View>

        {/* Title & Stats */}
        <View className="bg-white p-4 border-b border-gray-200">
          <Text className="text-xl font-black text-gray-900 mb-1">{segment.name}</Text>
          <Text className="text-xs text-gray-500 mb-3">
            {segment.sportType} Segment · {(segment.distanceMeters / 1000).toFixed(2)} km
          </Text>

          <View className="flex-row justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">AVG GRADE</Text>
              <Text className="text-base font-black text-gray-900 mt-0.5">{segment.averageGradePercent}%</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">ELEV GAIN</Text>
              <Text className="text-base font-black text-gray-900 mt-0.5">+{segment.elevationGainMeters} m</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[10px] text-gray-400 uppercase font-bold">YOUR PR</Text>
              <Text className="text-base font-black text-[#FC4C02] mt-0.5">{segment.userPrTimeFormatted || '3:45'}</Text>
            </View>
          </View>
        </View>

        {/* Elevation Profile */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Segment Climb Profile
          </Text>
          <ElevationChart />
        </View>

        {/* Local Legend Laurel Banner */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-3 border border-emerald-200">
                <Ionicons name="ribbon" size={20} color="#059669" />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Local Legend
                  </Text>
                  <View className="bg-emerald-100 px-1.5 py-0.5 rounded ml-1.5">
                    <Text className="text-[9px] font-bold text-emerald-800">90-DAY LCL</Text>
                  </View>
                </View>
                <Text className="text-xs font-bold text-gray-800 mt-0.5">
                  {segment.localLegendName || 'Marcus Vance'}
                </Text>
                <Text className="text-[10px] text-gray-400">
                  {segment.localLegendEffortsCount || 38} efforts in the last 90 days
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => alert('Local Legend is awarded to the athlete who records the most efforts on this segment over a rolling 90-day window.')} className="p-1">
              <Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Leaderboard Section */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-gray-900">Leaderboard</Text>
            <View className="flex-row bg-gray-100 p-0.5 rounded-lg">
              {(['OVERALL', 'THIS MONTH', 'FOLLOWING'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-md ${filter === tab ? 'bg-white shadow-sm' : ''}`}>
                  <Text className={`text-[10px] font-bold ${filter === tab ? 'text-gray-900' : 'text-gray-500'}`}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Leaderboard Rows */}
          {mockLeaderboard.map((item) => (
            <View
              key={item.rank}
              className={`flex-row items-center justify-between py-2.5 border-b border-gray-50 ${
                item.isYou ? 'bg-orange-50/50 px-2 rounded-xl my-0.5' : ''
              }`}>
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-6 flex-row items-center">
                  {item.rank === 1 ? (
                    <Ionicons name="trophy" size={14} color="#F59E0B" />
                  ) : (
                    <Text
                      className={`text-xs font-black ${
                        item.isYou ? 'text-[#FC4C02]' : 'text-gray-400'
                      }`}>
                      #{item.rank}
                    </Text>
                  )}
                </View>
                <Image source={{ uri: item.avatar }} className="w-8 h-8 rounded-full mr-2.5 bg-gray-100" />
                <View className="flex-1">
                  <Text className={`text-xs font-bold ${item.isYou ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
                    {item.name}
                  </Text>
                  <Text className="text-[10px] text-gray-400">{item.speed} · {item.date}</Text>
                </View>
              </View>

              <Text className="text-sm font-black text-gray-900">{item.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

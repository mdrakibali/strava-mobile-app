import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { useApp } from '../../context/AppContext';
import { Segment } from '../../types';

export default function MapsScreen() {
  const router = useRouter();
  const { segments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'ALL' | 'Run' | 'Ride'>('ALL');

  const filteredSegments = segments.filter((seg) => {
    const matchesSport = selectedSport === 'ALL' || seg.sportType === selectedSport;
    const matchesSearch = seg.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const renderSegmentItem = ({ item }: { item: Segment }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 border border-gray-200 gap-2"
      onPress={() => router.push({ pathname: '/segment/[id]', params: { id: item.id } })}
      activeOpacity={0.8}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-0.5">
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500">
            {item.sportType} · {(item.distanceMeters / 1000).toFixed(2)} km · Avg {item.averageGradePercent}% grade · +{item.elevationGainMeters}m
          </Text>
        </View>
        <View className="flex-row items-center bg-amber-100 px-2.5 py-1 rounded-full gap-1">
          <Ionicons name="trophy" size={14} color="#D97706" />
          <Text className="text-xs font-bold text-amber-900">#{item.rank || 1}</Text>
        </View>
      </View>

      <RouteMapPreview points={item.polylinePoints} height={120} />

      <View className="flex-row justify-between bg-gray-50 p-2.5 rounded-lg mt-1">
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-gray-500 mb-0.5">👑 KOM Crown</Text>
          <Text className="text-xs text-gray-900">
            {item.komAthleteName} · <Text className="font-bold">{item.komTimeFormatted}</Text>
          </Text>
        </View>

        {item.userPrTimeFormatted && (
          <View className="items-end">
            <Text className="text-[10px] font-bold text-gray-500 mb-0.5">Your PR</Text>
            <Text className="text-xs font-bold text-[#FC4C02]">{item.userPrTimeFormatted}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Search & Filter Bar */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <Text className="text-xl font-black text-gray-900 mb-2">
          Maps & Segments
        </Text>
        <View className="flex-row items-center bg-gray-50 px-3 h-10 rounded-lg border border-gray-200 gap-2 mb-2">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search segments, routes, climbs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-sm text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sport Type Filters */}
        <View className="flex-row gap-2 py-1">
          {(['ALL', 'Run', 'Ride'] as const).map((sport) => (
            <TouchableOpacity
              key={sport}
              className={`px-3 py-1 rounded-full border ${
                selectedSport === sport
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => setSelectedSport(sport)}>
              <Text
                className={`text-xs font-semibold ${
                  selectedSport === sport ? 'text-white' : 'text-gray-600'
                }`}>
                {sport === 'ALL' ? 'All Sports' : sport === 'Run' ? '🏃 Running' : '🚴 Cycling'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Segments List */}
      <FlatList
        data={filteredSegments}
        keyExtractor={(item) => item.id}
        renderItem={renderSegmentItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
            <View className="gap-1">
              <Text className="text-base font-bold text-gray-900">Discover Popular Routes</Text>
              <Text className="text-xs text-gray-500 leading-5 mb-1">
                Community-curated routes with verified road quality and elevation profiles.
              </Text>
              <TouchableOpacity
                className="flex-row items-center justify-center bg-[#FC4C02] py-2 px-3.5 rounded-lg gap-1.5 self-start mt-1"
                activeOpacity={0.8}>
                <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Create Custom Route</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

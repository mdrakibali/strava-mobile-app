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
import { MOCK_ROUTES } from '../../mock/data';
import { RouteItem, Segment } from '../../types';

export default function MapsScreen() {
  const router = useRouter();
  const { segments } = useApp();
  const [activeTab, setActiveTab] = useState<'routes' | 'segments'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'ALL' | 'Run' | 'Ride'>('ALL');

  const filteredSegments = segments.filter((seg) => {
    const matchesSport = selectedSport === 'ALL' || seg.sportType === selectedSport;
    const matchesSearch = seg.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const filteredRoutes = MOCK_ROUTES.filter((r) => {
    const matchesSport = selectedSport === 'ALL' || r.sportType === selectedSport;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      onPress={() => router.push(`/routes/${item.id}`)}
      activeOpacity={0.85}>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-base font-black text-gray-900 mb-0.5">{item.name}</Text>
          <Text className="text-xs text-gray-500 font-medium">
            {item.sportType} · {(item.distanceMeters / 1000).toFixed(1)} km · +{item.elevationGainMeters}m climb · {item.climbCategory}
          </Text>
        </View>
        <View className="bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
          <Text className="text-[10px] font-bold text-[#FC4C02]">
            {item.isPopular ? '★ Popular' : 'Saved'}
          </Text>
        </View>
      </View>

      <RouteMapPreview height={140} />

      <View className="flex-row justify-between items-center pt-2.5 mt-2 border-t border-gray-100">
        <Text className="text-[11px] font-semibold text-gray-500">
          Surface: {item.surfacePavedPercent}% Paved · {item.surfaceGravelPercent}% Gravel
        </Text>
        <View className="flex-row items-center">
          <Text className="text-xs font-bold text-[#FC4C02] mr-1">View Route</Text>
          <Ionicons name="chevron-forward" size={14} color="#FC4C02" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSegmentItem = ({ item }: { item: Segment }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      onPress={() => router.push(`/segment/${item.id}`)}
      activeOpacity={0.85}>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-base font-black text-gray-900 mb-0.5">{item.name}</Text>
          <Text className="text-xs text-gray-500">
            {item.sportType} · {(item.distanceMeters / 1000).toFixed(2)} km · Avg {item.averageGradePercent}% · +{item.elevationGainMeters}m
          </Text>
        </View>
        <View className="bg-amber-100 px-2.5 py-1 rounded-full flex-row items-center">
          <Ionicons name="trophy" size={12} color="#D97706" />
          <Text className="text-[10px] font-black text-amber-900 ml-1">#{item.rank || 1}</Text>
        </View>
      </View>

      <RouteMapPreview height={120} />

      <View className="flex-row justify-between bg-gray-50 p-2.5 rounded-xl mt-2 border border-gray-100">
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-gray-500">👑 KOM Record</Text>
          <Text className="text-xs font-black text-gray-900">
            {item.komAthleteName} · <Text className="text-[#FC4C02]">{item.komTimeFormatted}</Text>
          </Text>
        </View>
        {item.userPrTimeFormatted && (
          <View className="items-end">
            <Text className="text-[10px] font-bold text-gray-500">Your PR</Text>
            <Text className="text-xs font-black text-emerald-600">{item.userPrTimeFormatted}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Bar */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xl font-black text-gray-900">Maps & Routes 🧭</Text>
          <TouchableOpacity
            onPress={() => router.push('/analytics/heatmap')}
            className="flex-row items-center bg-gray-900 px-3 py-1.5 rounded-full">
            <Ionicons name="flame" size={14} color="#FC4C02" />
            <Text className="text-xs font-bold text-white ml-1">Heatmap</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center bg-gray-100 px-3 h-10 rounded-xl mb-2">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search routes, trails, segments..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-gray-900"
          />
        </View>

        {/* Sub-Tabs: Routes vs Segments */}
        <View className="flex-row bg-gray-100 p-0.5 rounded-xl mb-2">
          <TouchableOpacity
            onPress={() => setActiveTab('routes')}
            className={`flex-1 py-1.5 rounded-lg items-center ${activeTab === 'routes' ? 'bg-white shadow-sm' : ''}`}>
            <Text className={`text-xs font-black ${activeTab === 'routes' ? 'text-gray-900' : 'text-gray-500'}`}>
              Popular Routes ({filteredRoutes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('segments')}
            className={`flex-1 py-1.5 rounded-lg items-center ${activeTab === 'segments' ? 'bg-white shadow-sm' : ''}`}>
            <Text className={`text-xs font-black ${activeTab === 'segments' ? 'text-gray-900' : 'text-gray-500'}`}>
              Segments & KOMs ({filteredSegments.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      <FlatList
        data={activeTab === 'routes' ? (filteredRoutes as any) : filteredSegments}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'routes' ? (renderRouteItem as any) : renderSegmentItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          activeTab === 'routes' ? (
            <TouchableOpacity
              onPress={() => router.push('/routes/builder')}
              className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#FC4C02] items-center justify-center mr-3">
                  <Ionicons name="map" size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-gray-900">Custom Route Builder</Text>
                  <Text className="text-xs text-gray-500">Auto-loop generator & manual waypoints</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#FC4C02" />
            </TouchableOpacity>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

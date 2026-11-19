import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityCard } from '../../components/common/ActivityCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Header } from '../../components/common/Header';
import { useApp } from '../../context/AppContext';

export default function FeedScreen() {
  const router = useRouter();
  const { activities, isSyncing, refreshFeed } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FOLLOWING' | 'CLUBS'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedFilter === 'FOLLOWING') {
      return act.athlete.isFollowing || act.athlete.id === 'user_current';
    }
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Header />

      {/* Filter Chips Bar */}
      <View className="bg-white border-b border-gray-200 py-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row px-4 gap-2">
          {(['ALL', 'FOLLOWING', 'CLUBS'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`px-3.5 py-1.5 rounded-full border mr-2 ${
                selectedFilter === filter
                  ? 'bg-[#FC4C02] border-[#FC4C02]'
                  : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.7}>
              <Text
                className={`text-xs font-semibold ${
                  selectedFilter === filter ? 'text-white' : 'text-gray-600'
                }`}>
                {filter === 'ALL' ? 'All Activities' : filter === 'FOLLOWING' ? 'Following' : 'My Clubs'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Activity Feed FlatList */}
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard activity={item} />}
        contentContainerClassName="p-3 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} colors={['#FC4C02']} />
        }
        ListHeaderComponent={
          <View>
            {/* Weekly Volume Card */}
            <View className="flex-row justify-between items-center bg-white p-3.5 rounded-2xl mb-3 border border-gray-200 shadow-sm">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
                  <Ionicons name="flame" size={22} color="#FC4C02" />
                </View>
                <View>
                  <Text className="text-sm font-black text-gray-900">Weekly Volume</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {(activities.reduce((acc, a) => acc + (a.distanceMeters || 0), 0) / 1000).toFixed(1)} km logged · {activities.length} workouts
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/analytics/training-log')}
                className="bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 flex-row items-center">
                <Text className="text-[10px] font-bold text-[#FC4C02] mr-0.5">Log</Text>
                <Ionicons name="chevron-forward" size={10} color="#FC4C02" />
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="fitness-outline"
            title="No Activities Yet"
            description="Follow active athletes or record your first workout to see it in your personal feed."
            actionLabel="Discover Athletes"
            onAction={() => router.push('/search')}
          />
        }
      />
    </SafeAreaView>
  );
}

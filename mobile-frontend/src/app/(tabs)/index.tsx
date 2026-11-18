import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityCard } from '../../components/common/ActivityCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Header } from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { MOCK_ATHLETES } from '../../mock/data';

export default function FeedScreen() {
  const router = useRouter();
  const { activities } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FOLLOWING' | 'CLUBS'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedFilter === 'FOLLOWING') {
      return act.athlete.isFollowing || act.athlete.id === 'user_current';
    }
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />
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
                  <Text className="text-xs text-gray-500 mt-0.5">38.4 km logged · 3 runs</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/analytics/training-log')}
                className="bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                <Text className="text-[10px] font-bold text-[#FC4C02]">Log &gt;</Text>
              </TouchableOpacity>
            </View>

            {/* Suggested Athletes Quick Carousel */}
            <View className="bg-white p-3.5 rounded-2xl mb-3 border border-gray-200 shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-black text-gray-900">Connect with Athletes</Text>
                <TouchableOpacity onPress={() => router.push('/athlete/suggested')}>
                  <Text className="text-[11px] font-bold text-[#FC4C02]">See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MOCK_ATHLETES.map((athlete) => (
                  <TouchableOpacity
                    key={athlete.id}
                    onPress={() => router.push(`/athlete/${athlete.id}`)}
                    className="items-center mr-3 w-16">
                    <Image
                      source={{ uri: athlete.avatarUrl }}
                      className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200"
                    />
                    <Text className="text-[10px] font-bold text-gray-800 text-center mt-1" numberOfLines={1}>
                      {athlete.displayName.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="fitness-outline"
            title="No Activities Yet"
            description="Follow active athletes or record your first workout to see it in your personal feed."
            actionLabel="Discover Athletes"
            onAction={() => router.push('/athlete/suggested')}
          />
        }
      />
    </SafeAreaView>
  );
}

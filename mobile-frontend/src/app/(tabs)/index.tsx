import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityCard } from '../../components/common/ActivityCard';
import { Header } from '../../components/common/Header';
import { useApp } from '../../context/AppContext';

export default function FeedScreen() {
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
          <TouchableOpacity
            className={`px-3.5 py-1.5 rounded-full border ${
              selectedFilter === 'ALL'
                ? 'bg-[#FC4C02] border-[#FC4C02]'
                : 'bg-gray-50 border-gray-200'
            }`}
            onPress={() => setSelectedFilter('ALL')}
            activeOpacity={0.7}>
            <Text
              className={`text-xs font-semibold ${
                selectedFilter === 'ALL' ? 'text-white' : 'text-gray-600'
              }`}>
              All Activities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-3.5 py-1.5 rounded-full border ${
              selectedFilter === 'FOLLOWING'
                ? 'bg-[#FC4C02] border-[#FC4C02]'
                : 'bg-gray-50 border-gray-200'
            }`}
            onPress={() => setSelectedFilter('FOLLOWING')}
            activeOpacity={0.7}>
            <Text
              className={`text-xs font-semibold ${
                selectedFilter === 'FOLLOWING' ? 'text-white' : 'text-gray-600'
              }`}>
              Following
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-3.5 py-1.5 rounded-full border ${
              selectedFilter === 'CLUBS'
                ? 'bg-[#FC4C02] border-[#FC4C02]'
                : 'bg-gray-50 border-gray-200'
            }`}
            onPress={() => setSelectedFilter('CLUBS')}
            activeOpacity={0.7}>
            <Text
              className={`text-xs font-semibold ${
                selectedFilter === 'CLUBS' ? 'text-white' : 'text-gray-600'
              }`}>
              My Clubs
            </Text>
          </TouchableOpacity>
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
          <View className="flex-row justify-between items-center bg-white p-3.5 rounded-xl mb-3 border border-gray-200">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#FFF2EB] items-center justify-center">
                <Ionicons name="flame" size={20} color="#FC4C02" />
              </View>
              <View>
                <Text className="text-sm font-bold text-gray-900">Weekly Volume</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  18.6 km logged · 2 runs completed
                </Text>
              </View>
            </View>
            <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-700">
                +14% vs last week
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16 gap-2">
            <Ionicons name="fitness-outline" size={48} color="#9CA3AF" />
            <Text className="text-base font-bold text-gray-900">No activities found</Text>
            <Text className="text-xs text-gray-500 text-center">
              Follow more athletes or record your first workout!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

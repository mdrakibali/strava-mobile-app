import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { MOCK_ATHLETES } from '../mock/data';
import { Athlete } from '../types';

export default function SearchScreen() {
  const router = useRouter();
  const { toggleFollowAthlete } = useApp();
  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>(MOCK_ATHLETES);

  const filtered = athletes.filter(
    (a) =>
      a.displayName.toLowerCase().includes(query.toLowerCase()) ||
      a.username.toLowerCase().includes(query.toLowerCase()) ||
      a.city.toLowerCase().includes(query.toLowerCase())
  );

  const handleToggleFollow = (id: string) => {
    toggleFollowAthlete(id);
    setAthletes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isFollowing: !a.isFollowing } : a))
    );
  };

  const renderAthleteItem = ({ item }: { item: Athlete }) => (
    <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
      <Image source={{ uri: item.avatarUrl }} className="w-12 h-12 rounded-full bg-gray-100 mr-3" />

      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900">{item.displayName}</Text>
        <Text className="text-xs text-[#FC4C02] mt-0.5">@{item.username}</Text>
        <View className="flex-row items-center mt-0.5">
          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
          <Text className="text-[10px] text-gray-400 ml-0.5">{item.city}, {item.country}</Text>
        </View>
        {item.bio && <Text className="text-xs text-gray-600 mt-1" numberOfLines={1}>{item.bio}</Text>}
      </View>

      <TouchableOpacity
        className={`px-3.5 py-1.5 rounded-lg border ${
          item.isFollowing
            ? 'bg-gray-100 border-gray-200'
            : 'bg-[#FC4C02] border-[#FC4C02]'
        }`}
        onPress={() => handleToggleFollow(item.id)}>
        <Text
          className={`text-xs font-bold ${
            item.isFollowing ? 'text-gray-600' : 'text-white'
          }`}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Search Bar */}
      <View className="flex-row items-center px-3 py-2 border-b border-gray-200 gap-2">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center bg-gray-100 px-3 h-10 rounded-lg gap-2">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search athletes by name or city..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderAthleteItem}
        contentContainerStyle={{ paddingVertical: 4 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 gap-2">
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text className="text-base font-bold text-gray-900">No athletes found</Text>
            <Text className="text-xs text-gray-400">Try searching for a different name or city.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

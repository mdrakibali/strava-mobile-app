import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Athlete } from '../types';

export default function SearchScreen() {
  const router = useRouter();
  const { toggleFollowAthlete } = useApp();
  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search real athletes from Neon Database via Cloudflare Workers
  useEffect(() => {
    let isCancelled = false;
    const fetchAthletes = async () => {
      setIsLoading(true);
      try {
        const res = await api.athletes.search(query);
        if (!isCancelled && res.athletes) {
          setAthletes(
            res.athletes.map((a: any) => ({
              id: a.id,
              username: a.username,
              displayName: a.displayName,
              avatarUrl: a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
              city: a.city || 'Dhaka',
              country: a.country || 'Bangladesh',
              bio: a.bio || '',
              followersCount: a.followersCount || 0,
              followingCount: a.followingCount || 0,
              isFollowing: Boolean(a.isFollowing),
            }))
          );
        }
      } catch (err) {
        console.warn('Athlete search error:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchAthletes, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleToggleFollow = (id: string) => {
    toggleFollowAthlete(id);
    setAthletes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isFollowing: !a.isFollowing } : a))
    );
    api.athletes.toggleFollow(id).catch(console.warn);
  };

  const renderAthleteItem = ({ item }: { item: Athlete }) => (
    <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
      <TouchableOpacity
        className="flex-row items-center flex-1 mr-3"
        onPress={() => router.push(`/athlete/${item.id}`)}>
        <Image source={{ uri: item.avatarUrl }} className="w-12 h-12 rounded-full bg-gray-100 mr-3" />

        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{item.displayName}</Text>
          <Text className="text-xs text-[#FC4C02] mt-0.5">@{item.username}</Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text className="text-[10px] text-gray-400 ml-0.5">{item.city}, {item.country}</Text>
          </View>
          {item.bio ? <Text className="text-xs text-gray-600 mt-1" numberOfLines={1}>{item.bio}</Text> : null}
        </View>
      </TouchableOpacity>

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
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3.5 py-2">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search athletes by name, handle, or city..."
            value={query}
            onChangeText={setQuery}
            className="flex-1 ml-2 text-sm text-gray-900"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="small" color="#FC4C02" />
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(item) => item.id}
          renderItem={renderAthleteItem}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-6">
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-sm mt-3 font-medium text-center">
                {query ? 'No athletes found matching your search.' : 'Search for athletes to follow their activities and give kudos.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

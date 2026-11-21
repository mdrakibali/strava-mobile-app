import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { realtimeWs } from '../../services/websocket';

export default function MessagesInboxScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [suggestedAthletes, setSuggestedAthletes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const [convRes, athletesRes] = await Promise.all([
        api.messages.getConversations().catch(() => ({ conversations: [] })),
        api.athletes.search('').catch(() => ({ athletes: [] })),
      ]);

      if (convRes?.conversations) {
        setConversations(convRes.conversations);
      }
      if (athletesRes?.athletes) {
        setSuggestedAthletes(
          athletesRes.athletes.filter((a: any) => a.id !== currentUser?.id).slice(0, 4)
        );
      }
    } catch (err) {
      console.warn('Fetch conversations error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const unsub = realtimeWs.addListener('new_message', () => {
      fetchConversations();
    });
    return () => unsub();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const filtered = conversations.filter(
    (c) =>
      c.participant?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top Header */}
      <View
        style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
        className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Direct Messages</Text>
        <TouchableOpacity onPress={() => router.push('/athlete/suggested')} className="p-1">
          <Ionicons name="create-outline" size={24} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} className="px-4 py-2.5">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-xs text-gray-900"
          />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 100, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}>
          {isLoading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#FC4C02" />
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/messages/${item.participant.id}`)}
                className="flex-row items-center p-3.5 bg-white rounded-2xl mb-2.5 border border-gray-100 shadow-sm">
                <View className="relative mr-3">
                  <Image
                    source={{ uri: item.participant.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }}
                    className="w-12 h-12 rounded-full bg-gray-100"
                  />
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </View>
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                      {item.participant.displayName}
                    </Text>
                    <Text className="text-[10px] text-gray-400 font-medium">
                      {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs ${item.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-normal text-gray-500'}`}
                    numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View className="w-5 h-5 rounded-full bg-[#FC4C02] items-center justify-center">
                    <Text className="text-[10px] font-bold text-white">{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View className="py-8">
              <View className="items-center justify-center py-6">
                <Ionicons name="chatbubbles-outline" size={44} color="#D1D5DB" />
                <Text className="text-base font-bold text-gray-900 mt-2">No conversations yet</Text>
                <Text className="text-xs text-gray-400 mt-1 text-center px-4">
                  Send a message to an athlete below to start a conversation!
                </Text>
              </View>

              {/* Quick Start List with Suggested Athletes */}
              {suggestedAthletes.length > 0 && (
                <View className="mt-4">
                  <Text className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Suggested Athletes
                  </Text>
                  {suggestedAthletes.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/messages/${a.id}`)}
                      className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl mb-2 border border-gray-100 shadow-sm">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Image
                          source={{ uri: a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }}
                          className="w-10 h-10 rounded-full bg-gray-100 mr-3"
                        />
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{a.displayName}</Text>
                          <Text className="text-xs text-gray-400" numberOfLines={1}>@{a.username}</Text>
                        </View>
                      </View>
                      <View className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
                        <Text className="text-xs font-black text-[#FC4C02]">Chat</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

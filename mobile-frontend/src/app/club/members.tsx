import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

export default function ClubMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const res = await api.clubs.get(id);
          if (isMounted && res?.members) {
            setMembers(res.members);
            return;
          }
        }
        // Fallback to community athletes
        const athRes = await api.athletes.search('');
        if (isMounted && athRes?.athletes) {
          setMembers(athRes.athletes);
        }
      } catch (err) {
        console.warn('Failed to load club members:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const filtered = members.filter(
    (m) =>
      (m.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Club Roster ({members.length})</Text>
        <TouchableOpacity onPress={() => Alert.alert('Invite', 'Invite link copied to clipboard!')} className="p-1">
          <Ionicons name="person-add-outline" size={20} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 px-3.5 py-2 rounded-xl">
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search club athletes..."
            className="flex-1 ml-2 text-sm text-gray-900"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" color="#FC4C02" />
            <Text className="text-xs text-gray-400 mt-2">Loading roster...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center mt-4">
            <Ionicons name="people-outline" size={32} color="#D1D5DB" />
            <Text className="text-sm font-bold text-gray-800 mt-2">No members found</Text>
          </View>
        ) : (
          filtered.map((member, index) => (
            <TouchableOpacity
              key={member.id || member.athleteId || index}
              onPress={() => router.push(`/athlete/${member.athleteId || member.id}`)}
              className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl mb-2.5 border border-gray-100 shadow-sm">
              <View className="flex-row items-center flex-1 mr-3">
                <Image
                  source={{ uri: member.avatarUrl || undefined }}
                  className="w-12 h-12 rounded-full mr-3 bg-gray-100"
                />
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-gray-900 mr-2">{member.displayName}</Text>
                    {(member.role === 'ADMIN' || member.role === 'CREATOR' || index === 0) && (
                      <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] font-black text-[#FC4C02]">
                          {member.role || 'Club Leader'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400">@{member.username || 'athlete'}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="location-outline" size={10} color="#9CA3AF" />
                    <Text className="text-[10px] text-gray-400 ml-0.5">{member.city || ''}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

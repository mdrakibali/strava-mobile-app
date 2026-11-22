import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedList, setBlockedList] = useState<any[]>([]);

  const handleUnblock = (id: string) => {
    setBlockedList((prev) => prev.filter((b) => b.id !== id));
    Alert.alert('Unblock', 'Athlete unblocked.');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Blocked Athletes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4">
        <Text className="text-xs text-gray-500 mb-4 leading-4">
          Blocked athletes cannot view your profile, give kudos to your activities, see your routes, or message you in clubs.
        </Text>

        {blockedList.length > 0 ? (
          blockedList.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between p-4 bg-white rounded-2xl mb-3 border border-gray-100 shadow-sm">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-900">{item.name}</Text>
                <Text className="text-xs text-gray-400">@{item.username}</Text>
                <Text className="text-[10px] text-gray-400 mt-1">Reason: {item.reason}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleUnblock(item.id)}
                className="px-4 py-1.5 bg-gray-100 rounded-full">
                <Text className="text-xs font-bold text-gray-700">Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View className="bg-white p-8 rounded-2xl items-center border border-gray-100 mt-4">
            <Ionicons name="checkmark-circle-outline" size={36} color="#16A34A" />
            <Text className="text-sm font-bold text-gray-900 mt-2">No Blocked Athletes</Text>
            <Text className="text-xs text-gray-400 mt-1">Your block list is clean.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


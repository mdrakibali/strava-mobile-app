import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Club } from '../../types';

interface ClubsListProps {
  clubs: Club[];
  onToggleJoin: (clubId: string) => void;
}

export const ClubsList: React.FC<ClubsListProps> = ({ clubs, onToggleJoin }) => {
  const router = useRouter();

  return (
    <View className="space-y-3">
      {clubs.map((club) => (
        <TouchableOpacity
          key={club.id}
          activeOpacity={0.85}
          onPress={() => router.push(`/club/${club.id}`)}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3"
        >
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: club.avatarUrl }}
              className="w-14 h-14 rounded-xl mr-3 bg-gray-100"
            />
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-black text-gray-900 flex-1 mr-2" numberOfLines={1}>
                  {club.name}
                </Text>
                <View className="bg-orange-50 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-[#FC4C02]">{club.sportType}</Text>
                </View>
              </View>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {club.city} · {club.memberCount.toLocaleString()} Members
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-xs text-gray-600 line-clamp-2 mb-3 leading-4">
            {club.description}
          </Text>

          <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
            <Text className="text-[11px] font-semibold text-gray-400">
              {(club.weeklyDistanceMeters / 1000).toFixed(0)} km weekly volume
            </Text>
            <TouchableOpacity
              onPress={() => onToggleJoin(club.id)}
              className={`px-4 py-1.5 rounded-full ${
                club.isMember ? 'bg-gray-100' : 'bg-[#FC4C02]'
              }`}
            >
              <Text
                className={`text-xs font-bold ${club.isMember ? 'text-gray-700' : 'text-white'}`}
              >
                {club.isMember ? 'Joined' : 'Join Club'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={() => router.push('/club/create')}
        className="w-full py-3.5 bg-orange-50 border border-orange-200 rounded-xl items-center justify-center flex-row"
      >
        <Ionicons name="add-circle-outline" size={18} color="#FC4C02" />
        <Text className="text-sm font-bold text-[#FC4C02] ml-1.5">Create a New Club</Text>
      </TouchableOpacity>
    </View>
  );
};

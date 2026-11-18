import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Athlete } from '../../types';

interface KudosModalProps {
  visible: boolean;
  onClose: () => void;
  athletes: Athlete[];
}

export const KudosModal: React.FC<KudosModalProps> = ({ visible, onClose, athletes }) => {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-5 max-h-[70%]">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
          <View className="flex-row items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="thumbs-up" size={18} color="#FC4C02" />
              <Text className="text-base font-black text-gray-900 ml-2">
                Kudos ({athletes.length})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {athletes.map((athlete) => (
              <TouchableOpacity
                key={athlete.id}
                onPress={() => {
                  onClose();
                  router.push(`/athlete/${athlete.id}`);
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-gray-50">
                <View className="flex-row items-center flex-1 mr-3">
                  <Image
                    source={{ uri: athlete.avatarUrl }}
                    className="w-10 h-10 rounded-full mr-3 bg-gray-100"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
                    <Text className="text-xs text-gray-400">@{athlete.username}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};


import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  activityTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  activityTitle,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
          <Text className="text-lg font-black text-gray-900 mb-1">Share Activity</Text>
          <Text className="text-xs text-gray-500 mb-6" numberOfLines={1}>
            {activityTitle}
          </Text>

          <View className="flex-row justify-around mb-6">
            <TouchableOpacity onPress={onClose} className="items-center">
              <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center mb-2">
                <Ionicons name="link-outline" size={24} color="#FC4C02" />
              </View>
              <Text className="text-xs font-bold text-gray-700">Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="items-center">
              <View className="w-14 h-14 rounded-full bg-pink-100 items-center justify-center mb-2">
                <Ionicons name="logo-instagram" size={24} color="#E1306C" />
              </View>
              <Text className="text-xs font-bold text-gray-700">Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="items-center">
              <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-2">
                <Ionicons name="image-outline" size={24} color="#2563EB" />
              </View>
              <Text className="text-xs font-bold text-gray-700">Save Image</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-full py-3.5 bg-gray-100 rounded-2xl items-center">
            <Text className="text-sm font-bold text-gray-700">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


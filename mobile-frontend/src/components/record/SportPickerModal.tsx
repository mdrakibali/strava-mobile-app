import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { SportType } from '../../types';

interface SportPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSport: SportType;
  onSelectSport: (sport: SportType) => void;
}

const TOP_SPORTS: { id: SportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Ride', label: 'Ride', icon: 'bicycle-outline' },
  { id: 'Run', label: 'Run', icon: 'fitness-outline' },
  { id: 'Hike', label: 'Hike', icon: 'trail-sign-outline' },
  { id: 'Walk', label: 'Walk', icon: 'walk-outline' },
];

const WATER_SPORTS: { id: SportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Workout', label: 'Swim', icon: 'water-outline' },
  { id: 'Workout', label: 'Surf', icon: 'boat-outline' },
];

export const SportPickerModal: React.FC<SportPickerModalProps> = ({
  visible,
  onClose,
  selectedSport,
  onSelectSport,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
          {/* Handle */}
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-black text-gray-900">Choose a Sport</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Section: Your Top Sports */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Your Top Sports
          </Text>
          <View className="flex-row justify-between mb-6">
            {TOP_SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id && (sport.label === 'Run' ? selectedSport === 'Run' : true);
              return (
                <TouchableOpacity
                  key={sport.label}
                  onPress={() => {
                    onSelectSport(sport.id);
                    onClose();
                  }}
                  className="items-center w-16">
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center border-2 mb-1.5 ${
                      isSelected
                        ? 'bg-orange-50 border-[#FC4C02]'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                    <Ionicons
                      name={sport.icon}
                      size={24}
                      color={isSelected ? '#FC4C02' : '#374151'}
                    />
                  </View>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-[#FC4C02]' : 'text-gray-700'
                    }`}>
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Water & Adventure Sports */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Water & Adventure Sports
          </Text>
          <View className="space-y-2 mb-4">
            {WATER_SPORTS.map((sport) => (
              <TouchableOpacity
                key={sport.label}
                onPress={() => {
                  onSelectSport(sport.id);
                  onClose();
                }}
                className="flex-row items-center py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100">
                <Ionicons name={sport.icon} size={20} color="#374151" />
                <Text className="text-sm font-bold text-gray-800 ml-3">{sport.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};


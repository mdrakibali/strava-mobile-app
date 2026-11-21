import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  activityTitle: string;
  distanceFormatted?: string;
  paceFormatted?: string;
  elevationFormatted?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  activityTitle,
  distanceFormatted = '10.42 km',
  paceFormatted = '4:59 /km',
  elevationFormatted = '245 m',
}) => {
  const [selectedStyle, setSelectedStyle] = useState<'orange' | 'dark' | 'minimal'>('orange');

  const handleShareAction = (platform: string) => {
    Alert.alert('Stat Sticker Shared!', `Your Kinetix workout sticker was shared to ${platform}.`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-3xl p-5 shadow-2xl">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-base font-black text-gray-900">Kinetix Stat Sticker</Text>
              <Text className="text-xs text-gray-400">Export graphics to Instagram & socials</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Live Sticker Card Preview */}
          <View
            className={`w-full h-44 rounded-2xl p-4 justify-between mb-4 shadow-lg border ${
              selectedStyle === 'orange'
                ? 'bg-[#FC4C02] border-orange-500'
                : selectedStyle === 'dark'
                ? 'bg-stone-900 border-stone-800'
                : 'bg-white border-gray-200'
            }`}>
            {/* Top Row: Brand & Title */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text
                  className={`text-[10px] font-black tracking-widest ${
                    selectedStyle === 'minimal' ? 'text-[#FC4C02]' : 'text-white/80'
                  }`}>
                  KINETIX
                </Text>
                <Text
                  className={`text-sm font-black ${
                    selectedStyle === 'minimal' ? 'text-gray-900' : 'text-white'
                  }`}
                  numberOfLines={1}>
                  {activityTitle}
                </Text>
              </View>
              <Ionicons
                name="fitness"
                size={20}
                color={selectedStyle === 'minimal' ? '#FC4C02' : '#FFFFFF'}
              />
            </View>

            {/* Simulated Route Glow Vector */}
            <View className="h-10 items-center justify-center opacity-70">
              <View
                className={`w-32 h-1 rounded-full ${
                  selectedStyle === 'minimal' ? 'bg-[#FC4C02]' : 'bg-white'
                }`}
              />
            </View>

            {/* Bottom Row: Metrics Grid */}
            <View className="flex-row justify-between items-baseline pt-2 border-t border-white/20">
              <View>
                <Text
                  className={`text-[9px] uppercase font-bold ${
                    selectedStyle === 'minimal' ? 'text-gray-400' : 'text-white/70'
                  }`}>
                  Distance
                </Text>
                <Text
                  className={`text-xl font-black ${
                    selectedStyle === 'minimal' ? 'text-gray-900' : 'text-white'
                  }`}>
                  {distanceFormatted}
                </Text>
              </View>

              <View>
                <Text
                  className={`text-[9px] uppercase font-bold ${
                    selectedStyle === 'minimal' ? 'text-gray-400' : 'text-white/70'
                  }`}>
                  Pace
                </Text>
                <Text
                  className={`text-xl font-black ${
                    selectedStyle === 'minimal' ? 'text-gray-900' : 'text-white'
                  }`}>
                  {paceFormatted}
                </Text>
              </View>

              <View>
                <Text
                  className={`text-[9px] uppercase font-bold ${
                    selectedStyle === 'minimal' ? 'text-gray-400' : 'text-white/70'
                  }`}>
                  Elevation
                </Text>
                <Text
                  className={`text-xl font-black ${
                    selectedStyle === 'minimal' ? 'text-gray-900' : 'text-white'
                  }`}>
                  {elevationFormatted}
                </Text>
              </View>
            </View>
          </View>

          {/* Style Selector Chips */}
          <View className="flex-row justify-center space-x-2 mb-4">
            {(
              [
                { id: 'orange', label: 'Classic Orange' },
                { id: 'dark', label: 'Dark Matter' },
                { id: 'minimal', label: 'Minimal White' },
              ] as const
            ).map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedStyle(s.id)}
                className={`px-3.5 py-1.5 rounded-full border mx-1 ${
                  selectedStyle === s.id
                    ? 'bg-[#FC4C02] border-[#FC4C02]'
                    : 'bg-gray-100 border-gray-200'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    selectedStyle === s.id ? 'text-white' : 'text-gray-700'
                  }`}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Share Action Grid */}
          <View className="flex-row justify-around mb-4 pt-2 border-t border-gray-100">
            <TouchableOpacity onPress={() => handleShareAction('Instagram Stories')} className="items-center">
              <View className="w-12 h-12 rounded-full bg-pink-50 items-center justify-center mb-1 border border-pink-200">
                <Ionicons name="logo-instagram" size={22} color="#E1306C" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleShareAction('WhatsApp')} className="items-center">
              <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-1 border border-emerald-200">
                <Ionicons name="logo-whatsapp" size={22} color="#10B981" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleShareAction('Photo Gallery')} className="items-center">
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-1 border border-blue-200">
                <Ionicons name="download-outline" size={22} color="#2563EB" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Save Image</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleShareAction('Clipboard')} className="items-center">
              <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-1 border border-orange-200">
                <Ionicons name="link-outline" size={22} color="#FC4C02" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'GPX File Exported',
                  `Activity GPX track with GPS coordinates and timestamps generated successfully!`
                );
                onClose();
              }}
              className="items-center">
              <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mb-1 border border-purple-200">
                <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
              </View>
              <Text className="text-[10px] font-bold text-gray-700">Export GPX</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

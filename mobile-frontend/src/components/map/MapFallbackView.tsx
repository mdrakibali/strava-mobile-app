import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapMarkerItem } from './mapTypes';

interface MapFallbackViewProps {
  routeCoordinates?: [number, number][];
  markers?: MapMarkerItem[];
  onMarkerPress?: (marker: MapMarkerItem) => void;
}

export const MapFallbackView: React.FC<MapFallbackViewProps> = ({
  routeCoordinates,
  markers = [],
  onMarkerPress,
}) => {
  return (
    <View className="flex-1 bg-stone-100 items-center justify-center relative">
      <View className="absolute inset-0 bg-[#F4F3F0]">
        <View className="flex-1 opacity-20 border-b border-r border-gray-400" />
      </View>

      <View className="absolute w-full h-1 bg-gray-300 top-1/3 -rotate-6" />
      <View className="absolute w-full h-1.5 bg-gray-300 top-1/2 rotate-12" />
      <View className="absolute w-1.5 h-full bg-gray-300 left-1/3" />

      {routeCoordinates && routeCoordinates.length > 1 && (
        <View className="absolute inset-x-8 inset-y-16 items-center justify-center">
          <View className="w-48 h-32 border-4 border-[#FC4C02] rounded-3xl opacity-90 -rotate-12 bg-orange-500/10" />
        </View>
      )}

      <View className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md items-center justify-center">
        <View className="w-2 h-2 rounded-full bg-white" />
      </View>

      {markers.map((m, idx) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onMarkerPress && onMarkerPress(m)}
          style={{
            position: 'absolute',
            top: `${30 + (idx % 3) * 20}%`,
            left: `${25 + (idx % 3) * 25}%`,
          }}
          className="items-center">
          <View className="w-8 h-8 rounded-full bg-[#FC4C02] border-2 border-white shadow-md items-center justify-center">
            <Ionicons name="location" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-[10px] font-black text-gray-800 bg-white/90 px-1.5 py-0.5 rounded shadow mt-0.5">
            {m.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

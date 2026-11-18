import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_GEAR } from '../../mock/data';

export default function GearListScreen() {
  const router = useRouter();
  const [gearList, setGearList] = useState(MOCK_GEAR);

  const handleRetire = (id: string) => {
    setGearList((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isRetired: true } : g))
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">My Gear 👟🚴</Text>
        <TouchableOpacity onPress={() => router.push('/gear/add')} className="p-1">
          <Ionicons name="add" size={24} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        <Text className="text-xs font-semibold text-gray-500 mb-3">Shoes & Bikes Mileage Tracker</Text>

        {gearList.map((item) => {
          const currentKm = Math.round(item.distanceMeters / 1000);
          const maxKm = Math.round(item.maxDistanceMeters / 1000);
          const percent = Math.min(100, Math.round((currentKm / maxKm) * 100));
          const isNearRetirement = percent >= 85;

          return (
            <View
              key={item.id}
              className={`p-4 bg-white rounded-2xl mb-3 border shadow-sm ${
                isNearRetirement ? 'border-amber-300' : 'border-gray-100'
              }`}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                    <Ionicons
                      name={item.sportType === 'Run' ? 'footsteps-outline' : 'bicycle-outline'}
                      size={20}
                      color="#FC4C02"
                    />
                  </View>
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-black text-gray-900 mr-2">{item.name}</Text>
                      {item.isDefault && (
                        <View className="bg-orange-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-[#FC4C02]">Default</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-400">{item.brand} · {item.model}</Text>
                  </View>
                </View>

                {item.isRetired && (
                  <View className="bg-gray-100 px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-bold text-gray-500">Retired</Text>
                  </View>
                )}
              </View>

              {/* Progress Bar */}
              <View className="my-2">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-bold text-gray-700">
                    {currentKm} / {maxKm} km
                  </Text>
                  <Text className={`text-xs font-bold ${isNearRetirement ? 'text-amber-600' : 'text-gray-500'}`}>
                    {percent}% Life
                  </Text>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full ${isNearRetirement ? 'bg-amber-500' : 'bg-[#FC4C02]'}`}
                  />
                </View>
              </View>

              {isNearRetirement && !item.isRetired && (
                <View className="flex-row items-center bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1 mb-2">
                  <Ionicons name="warning-outline" size={14} color="#D97706" />
                  <Text className="text-[10px] font-bold text-amber-800 ml-1.5 flex-1">
                    Wear alert: Cushioning near lifespan limit. Consider retiring soon.
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center pt-2 border-t border-gray-50">
                <Text className="text-[10px] text-gray-400">Added: {item.purchaseDate}</Text>
                {!item.isRetired && (
                  <TouchableOpacity onPress={() => handleRetire(item.id)}>
                    <Text className="text-xs font-bold text-gray-500">Retire Gear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Gear Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={() => router.push('/gear/add')}
          className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
          <Text className="text-base font-black text-white">+ Add Shoes or Bike</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


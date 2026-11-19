import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

export default function GearListScreen() {
  const router = useRouter();
  const [gearList, setGearList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGear = async () => {
    setIsLoading(true);
    try {
      const res = await api.gear.list();
      if (res?.gear) {
        setGearList(res.gear);
      }
    } catch (err) {
      console.warn('Failed to load gear list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGear();
  }, []);

  const handleRetire = (id: string) => {
    Alert.alert(
      'Retire Gear?',
      'Retired gear will no longer be selected as default for new workouts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retire',
          onPress: async () => {
            setGearList((prev) =>
              prev.map((g) => (g.id === id ? { ...g, isRetired: true } : g))
            );
            try {
              await api.gear.update(id, { isRetired: true });
            } catch (err) {
              console.warn('Failed to retire gear:', err);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Gear', 'Are you sure you want to remove this gear?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setGearList((prev) => prev.filter((g) => g.id !== id));
          try {
            await api.gear.delete(id);
          } catch (err) {
            console.warn('Failed to delete gear:', err);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">My Gear</Text>
        <TouchableOpacity onPress={() => router.push('/gear/add')} className="p-1">
          <Ionicons name="add" size={24} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-28">
        <Text className="text-xs font-semibold text-gray-500 mb-3">
          Shoes & Bikes Mileage Tracker (Connected to Database)
        </Text>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" color="#FC4C02" />
            <Text className="text-xs text-gray-400 mt-2">Loading your gear...</Text>
          </View>
        ) : gearList.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center mt-4">
            <Ionicons name="footsteps-outline" size={36} color="#D1D5DB" />
            <Text className="text-sm font-black text-gray-900 mt-3">No Gear Added Yet</Text>
            <Text className="text-xs text-gray-400 text-center mt-1 mb-4 leading-4">
              Add your running shoes or bike to track equipment wear, prevent injuries, and monitor mileage limits.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/gear/add')}
              className="py-3 px-6 bg-[#FC4C02] rounded-xl">
              <Text className="text-xs font-black text-white">+ Add Your First Gear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          gearList.map((item) => {
            const currentKm = Math.round(Number(item.distanceMeters || 0) / 1000);
            const maxKm = Math.round(Number(item.maxDistanceMeters || 500000) / 1000);
            const percent = Math.min(100, Math.round((currentKm / (maxKm || 1)) * 100));
            const isNearRetirement = percent >= 85;

            return (
              <View
                key={item.id}
                className={`p-4 bg-white rounded-2xl mb-3 border shadow-sm ${
                  isNearRetirement ? 'border-amber-300' : 'border-gray-100'
                }`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                      <Ionicons
                        name={item.sportType === 'Run' ? 'footsteps-outline' : 'bicycle-outline'}
                        size={20}
                        color="#FC4C02"
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-black text-gray-900 mr-2" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.isDefault && (
                          <View className="bg-orange-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] font-bold text-[#FC4C02]">Default</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-400">
                        {item.brand} · {item.model}
                      </Text>
                    </View>
                  </View>

                  {item.isRetired ? (
                    <View className="bg-gray-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-bold text-gray-500">Retired</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-1">
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
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
                  <Text className="text-[10px] text-gray-400">
                    Sport: {item.sportType || 'Run'}
                  </Text>
                  {!item.isRetired && (
                    <TouchableOpacity onPress={() => handleRetire(item.id)}>
                      <Text className="text-xs font-bold text-gray-500">Retire Gear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
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

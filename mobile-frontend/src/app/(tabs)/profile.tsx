import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, activities } = useApp();
  const [beaconEnabled, setBeaconEnabled] = useState(true);
  const [privacyZoneActive, setPrivacyZoneActive] = useState(true);

  const totalKm = activities
    .reduce((acc, curr) => acc + curr.distanceMeters / 1000, 0)
    .toFixed(1);
  const totalElev = activities.reduce((acc, curr) => acc + curr.elevationGainMeters, 0);
  const totalHours = Math.round(
    activities.reduce((acc, curr) => acc + curr.movingTimeSeconds / 3600, 0)
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Profile Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row justify-between items-start mb-3">
            <Image
              source={{ uri: currentUser.avatarUrl }}
              className="w-[72px] h-[72px] rounded-full border-2 border-[#FC4C02] bg-gray-100"
            />
            <TouchableOpacity className="p-1" onPress={() => router.push('/settings/privacy')}>
              <Ionicons name="settings-outline" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-black text-gray-900">{currentUser.displayName}</Text>
          <Text className="text-sm font-semibold text-[#FC4C02] mb-1">@{currentUser.username}</Text>
          <Text className="text-xs text-gray-400 mb-2">
            📍 {currentUser.city}, {currentUser.country}
          </Text>

          {currentUser.bio && (
            <Text className="text-sm text-gray-600 leading-5 mb-3">{currentUser.bio}</Text>
          )}

          {/* Followers / Following counts */}
          <View className="flex-row justify-around border-t border-gray-100 pt-3">
            <View className="items-center">
              <Text className="text-base font-black text-gray-900">{currentUser.followingCount}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Following</Text>
            </View>
            <View className="w-[1px] h-4/5 bg-gray-200 self-center" />
            <View className="items-center">
              <Text className="text-base font-black text-gray-900">{currentUser.followersCount}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Followers</Text>
            </View>
            <View className="w-[1px] h-4/5 bg-gray-200 self-center" />
            <View className="items-center">
              <Text className="text-base font-black text-gray-900">{activities.length}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Activities</Text>
            </View>
          </View>
        </View>

        {/* 4-Week Volume Summary */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <Text className="text-sm font-bold text-gray-900 mb-3">Last 4 Weeks</Text>
          <View className="flex-row justify-between bg-gray-50 p-3 rounded-lg">
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-gray-400 uppercase mb-0.5">Total Distance</Text>
              <Text className="text-base font-black text-gray-900">{totalKm} km</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-gray-400 uppercase mb-0.5">Moving Time</Text>
              <Text className="text-base font-black text-gray-900">{totalHours}h 45m</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-gray-400 uppercase mb-0.5">Elev Gain</Text>
              <Text className="text-base font-black text-gray-900">+{totalElev} m</Text>
            </View>
          </View>
        </View>

        {/* Trophy Case */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-bold text-gray-900">Trophy Case</Text>
            <Text className="text-xs font-semibold text-[#FC4C02]">3 Unlocked</Text>
          </View>
          <View className="flex-row justify-between">
            <View className="flex-1 items-center">
              <View className="w-12 h-12 rounded-full items-center justify-center bg-amber-100 mb-1">
                <Ionicons name="trophy" size={24} color="#D97706" />
              </View>
              <Text className="text-xs font-bold text-gray-900 text-center">👑 KOM Crown</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">Lakeside Dash</Text>
            </View>

            <View className="flex-1 items-center">
              <View className="w-12 h-12 rounded-full items-center justify-center bg-emerald-100 mb-1">
                <Ionicons name="ribbon" size={24} color="#059669" />
              </View>
              <Text className="text-xs font-bold text-gray-900 text-center">10k PR Medal</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">44:12</Text>
            </View>

            <View className="flex-1 items-center">
              <View className="w-12 h-12 rounded-full items-center justify-center bg-[#FFF2EB] mb-1">
                <Ionicons name="medal" size={24} color="#FC4C02" />
              </View>
              <Text className="text-xs font-bold text-gray-900 text-center">Nov Elevation</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">2,000m Climb</Text>
            </View>
          </View>
        </View>

        {/* Gear & Shoes Tracker */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <Text className="text-sm font-bold text-gray-900 mb-3">Gear & Shoe Mileage</Text>
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-lg bg-[#FFF2EB] items-center justify-center mr-3">
              <Ionicons name="footsteps-outline" size={20} color="#FC4C02" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">Nike Air Zoom Pegasus 41</Text>
              <Text className="text-xs text-gray-400 mt-0.5 mb-1">
                Daily Road Trainer · 242.8 / 600 km
              </Text>
              <View className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <View className="h-full bg-[#FC4C02] rounded-full w-[40%]" />
              </View>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-lg bg-[#FFF2EB] items-center justify-center mr-3">
              <Ionicons name="bicycle-outline" size={20} color="#FC4C02" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">Specialized Allez Sprint</Text>
              <Text className="text-xs text-gray-400 mt-0.5 mb-1">
                Road Bike · 1,280 km logged
              </Text>
              <View className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <View className="h-full bg-[#FC4C02] rounded-full w-[65%]" />
              </View>
            </View>
          </View>
        </View>

        {/* Privacy & Safety Settings */}
        <View className="bg-white mt-3 p-4 border-y border-gray-200">
          <Text className="text-sm font-bold text-gray-900 mb-3">Privacy & Safety Controls</Text>

          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Privacy Zones (Start/End Masking)</Text>
              <Text className="text-xs text-gray-500 leading-4 mt-0.5">
                Hides your GPS track within a 500m radius of your Home address.
              </Text>
            </View>
            <Switch
              value={privacyZoneActive}
              onValueChange={setPrivacyZoneActive}
              trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
            />
          </View>

          <View className="flex-row justify-between items-center border-t border-gray-100 pt-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Beacon Live Safety Tracking</Text>
              <Text className="text-xs text-gray-500 leading-4 mt-0.5">
                Broadcasts your live GPS & battery to emergency contacts during workouts.
              </Text>
            </View>
            <Switch
              value={beaconEnabled}
              onValueChange={setBeaconEnabled}
              trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

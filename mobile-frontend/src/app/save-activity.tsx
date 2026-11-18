import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StravaMapView } from '../components/map/StravaMapView';
import { useApp } from '../context/AppContext';

export default function SaveActivityScreen() {
  const router = useRouter();
  const { activeRecording, saveNewActivity } = useApp();

  const defaultTitle = `${activeRecording.sportType} Workout`;
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'>('PUBLIC');
  const [applyPrivacyZone, setApplyPrivacyZone] = useState(true);
  const [excludeFromFeed, setExcludeFromFeed] = useState(false);

  const handleSave = () => {
    saveNewActivity(title, description, visibility);
    router.replace('/(tabs)');
  };

  const routeCoords = activeRecording.routeCoordinates.map(
    (c) => [c.longitude, c.latitude] as [number, number]
  );
  const centerCoord = routeCoords[0] || [90.4125, 23.7745];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Save Activity</Text>
        <TouchableOpacity onPress={handleSave} className="p-1">
          <Text className="text-base font-black text-[#FC4C02]">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 pb-20 space-y-4">
        {/* Real Route Map Preview Thumbnail */}
        <View className="w-full h-44 rounded-2xl overflow-hidden border border-gray-200 bg-stone-100 mb-3" pointerEvents="none">
          <StravaMapView
            styleKey="positron"
            centerCoordinate={centerCoord}
            routeCoordinates={routeCoords.length > 0 ? routeCoords : undefined}
            zoomLevel={13}
            showControls={false}
            showUserLocation={false}
            className="w-full h-full"
          />
        </View>

        {/* Workout Quick Summary */}
        <View className="flex-row justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-3">
          <View className="items-center">
            <Text className="text-[10px] text-gray-400 font-bold uppercase">DISTANCE</Text>
            <Text className="text-base font-black text-gray-900 mt-0.5">
              {(activeRecording.distanceMeters / 1000).toFixed(2)} km
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-[10px] text-gray-400 font-bold uppercase">TIME</Text>
            <Text className="text-base font-black text-gray-900 mt-0.5">
              {Math.floor(activeRecording.movingSeconds / 60)}m {activeRecording.movingSeconds % 60}s
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-[10px] text-gray-400 font-bold uppercase">ELEVATION</Text>
            <Text className="text-base font-black text-gray-900 mt-0.5">
              +{activeRecording.elevationGainMeters} m
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <View className="mb-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Activity Title
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            value={title}
            onChangeText={setTitle}
            placeholder="Give your workout an epic title"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description Input */}
        <View className="mb-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Description
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 h-20"
            value={description}
            onChangeText={setDescription}
            placeholder="How did the pace and elevation feel?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Visibility Controls */}
        <View className="mb-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Who Can See This Activity?
          </Text>
          <View className="space-y-2">
            {(
              [
                { id: 'PUBLIC', label: 'Everyone', desc: 'Visible on feeds, segments, and leaderboards' },
                { id: 'FOLLOWERS_ONLY', label: 'Followers Only', desc: 'Only athletes who follow you' },
                { id: 'ONLY_ME', label: 'Only You', desc: 'Private training log entry' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.id}
                className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${
                  visibility === opt.id ? 'border-[#FC4C02] bg-orange-50/50' : 'border-gray-200 bg-gray-50'
                }`}
                onPress={() => setVisibility(opt.id)}>
                <View className="flex-1 mr-2">
                  <Text
                    className={`text-sm font-bold ${
                      visibility === opt.id ? 'text-[#FC4C02]' : 'text-gray-900'
                    }`}>
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{opt.desc}</Text>
                </View>
                {visibility === opt.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#FC4C02" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Zone Masking */}
        <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">Privacy Zone Masking</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Hides start and finish GPS points within 500m of your home.
            </Text>
          </View>
          <Switch
            value={applyPrivacyZone}
            onValueChange={setApplyPrivacyZone}
            trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
          />
        </View>

        {/* Exclude From Home Feed Toggle */}
        <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">Mute Activity</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Don't publish this activity to followers' home or club feeds.
            </Text>
          </View>
          <Switch
            value={excludeFromFeed}
            onValueChange={setExcludeFromFeed}
            trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
          />
        </View>

        {/* Big Save Button */}
        <TouchableOpacity
          className="bg-[#FC4C02] py-4 rounded-2xl items-center justify-center shadow-lg"
          onPress={handleSave}
          activeOpacity={0.85}>
          <Text className="text-base font-black text-white tracking-wider uppercase">
            Save Activity
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

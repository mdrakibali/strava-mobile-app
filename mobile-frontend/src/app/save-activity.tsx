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
import { useApp } from '../context/AppContext';

export default function SaveActivityScreen() {
  const router = useRouter();
  const { activeRecording, saveNewActivity } = useApp();

  const defaultTitle = `${activeRecording.sportType} Workout`;
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'>('PUBLIC');
  const [applyPrivacyZone, setApplyPrivacyZone] = useState(true);

  const handleSave = () => {
    saveNewActivity(title, description, visibility);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Save Activity</Text>
        <TouchableOpacity onPress={handleSave} className="p-1">
          <Text className="text-base font-bold text-[#FC4C02]">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
        {/* Workout Quick Summary */}
        <View className="flex-row justify-between bg-gray-50 p-3.5 rounded-xl">
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

        {/* Title & Description Fields */}
        <View className="gap-1">
          <Text className="text-xs font-bold text-gray-400 tracking-wider">ACTIVITY TITLE</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900"
            value={title}
            onChangeText={setTitle}
            placeholder="Give your activity a title..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="gap-1">
          <Text className="text-xs font-bold text-gray-400 tracking-wider">DESCRIPTION</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 h-20"
            value={description}
            onChangeText={setDescription}
            placeholder="How did it feel? (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Visibility Selector */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-gray-400 tracking-wider">WHO CAN SEE THIS?</Text>
          <View className="gap-2">
            {(
              [
                { id: 'PUBLIC', label: 'Everyone', desc: 'Visible on feeds & leaderboards' },
                { id: 'FOLLOWERS_ONLY', label: 'Followers Only', desc: 'Hidden from public leaderboards' },
                { id: 'ONLY_ME', label: 'Only You', desc: 'Private personal training log' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.id}
                className={`flex-row items-center justify-between bg-gray-50 border rounded-lg p-3 ${
                  visibility === opt.id ? 'border-[#FC4C02] bg-[#FFF2EB]' : 'border-gray-200'
                }`}
                onPress={() => setVisibility(opt.id)}>
                <View className="flex-1">
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

        {/* Privacy Zone Masking Toggle */}
        <View className="flex-row justify-between items-center bg-gray-50 p-3.5 rounded-lg">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">Apply Privacy Zone Masking</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Clips the first and last 500m of the GPS track around your home/office.
            </Text>
          </View>
          <Switch
            value={applyPrivacyZone}
            onValueChange={setApplyPrivacyZone}
            trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
          />
        </View>

        {/* Big Save Button */}
        <TouchableOpacity
          className="bg-[#FC4C02] h-14 rounded-full items-center justify-center shadow-md mt-2"
          onPress={handleSave}
          activeOpacity={0.85}>
          <Text className="text-base font-black text-white tracking-wider">
            SAVE & POST TO FEED
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
